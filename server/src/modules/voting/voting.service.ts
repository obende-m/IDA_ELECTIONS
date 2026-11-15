import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { writeAuditLog } from '../../lib/audit';
import { generateVoteReferenceNumber } from '../../lib/voteReference';
import { getValidToken, lockVoterRow } from '../voters/voter.service';
import { applyScheduledTransition } from '../../lib/election';
import { recordVoteInTallies } from '../analytics/analytics.service';
import type { CastVoteInput, VoteRecordsQuery } from './voting.validation';
import type { Actor } from '../../lib/actor';

/** "Voting has not opened yet. It opens on Friday, 20 November 2026 at 9:00 am (Nigeria time)." when it's still to come. */
export function notOpenMessage(election: { status: string; startTime: Date | null }, now = new Date()): string {
  if (election.status === 'DRAFT' && election.startTime && election.startTime > now) {
    const opens = election.startTime.toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' });
    return `Voting has not opened yet. It opens on ${opens} (Nigeria time). Please come back then with this same link.`;
  }
  return 'Voting is not currently open for this election.';
}

export async function getBallot(rawToken: string, req?: import('express').Request) {
  const token = await getValidToken(rawToken, req);

  // Voters never go through getCurrentElection(), so apply the scheduled open/close here too:
  // otherwise voting could stay open past endTime (or not open at startTime) until an admin request.
  const election = await applyScheduledTransition(
    await prisma.election.findUniqueOrThrow({ where: { id: token.electionId } })
  );
  if (election.status !== 'ACTIVE') {
    throw new AppError(notOpenMessage(election), 409);
  }
  if (election.isLocked) {
    throw new AppError('This election is locked. Voting is temporarily unavailable.', 423);
  }
  if (!token.voter.isActive) {
    throw new AppError('This voter account is not active. Please contact the Electoral Committee.', 403);
  }

  const positions = await prisma.position.findMany({
    where: { electionId: token.electionId },
    orderBy: { displayOrder: 'asc' },
    include: {
      candidates: {
        orderBy: { displayOrder: 'asc' },
        select: { id: true, name: true, bio: true, photoUrl: true },
      },
    },
  });

  return {
    election: { id: election.id, title: election.title, year: election.year },
    positions,
  };
}

/**
 * Atomically: claims the token (compare-and-swap on status='ISSUED' so a concurrent double-submit
 * can never both succeed — one of them will always find zero rows matched and abort), records the
 * ballot, and updates the voter's status. This is the one moment a vote and its token invalidation
 * happen together or not at all.
 */
export async function castVote(rawToken: string, input: CastVoteInput, req?: import('express').Request): Promise<{ referenceNumber: string }> {
  const token = await getValidToken(rawToken, req);

  const election = await applyScheduledTransition(
    await prisma.election.findUniqueOrThrow({ where: { id: token.electionId } })
  );
  if (election.status !== 'ACTIVE') {
    throw new AppError(notOpenMessage(election), 409);
  }
  if (election.isLocked) {
    throw new AppError('This election is locked. Voting is temporarily unavailable.', 423);
  }
  if (!token.voter.isActive) {
    throw new AppError('This voter account is not active. Please contact the Electoral Committee.', 403);
  }

  const positions = await prisma.position.findMany({
    where: { electionId: token.electionId },
    include: { candidates: { select: { id: true } } },
  });
  const positionMap = new Map(positions.map((p) => [p.id, p]));

  // The same position may appear only once: otherwise a voter could split a 1-seat position across
  // two entries and exceed maxSelections.
  const seenPositionIds = new Set<string>();
  for (const selection of input.selections) {
    if (seenPositionIds.has(selection.positionId)) {
      throw new AppError('Each position may only appear once in a ballot.', 400);
    }
    seenPositionIds.add(selection.positionId);

    const position = positionMap.get(selection.positionId);
    if (!position) throw new AppError('One of the selected positions is invalid.', 400);

    const uniqueCandidateIds = new Set(selection.candidateIds);
    if (uniqueCandidateIds.size !== selection.candidateIds.length) {
      throw new AppError(`Duplicate candidate selection for ${position.title}.`, 400);
    }
    if (selection.candidateIds.length > position.maxSelections) {
      throw new AppError(`You may select at most ${position.maxSelections} candidate(s) for ${position.title}.`, 400);
    }

    const validCandidateIds = new Set(position.candidates.map((c) => c.id));
    for (const candidateId of selection.candidateIds) {
      if (!validCandidateIds.has(candidateId)) {
        throw new AppError(`One of the selected candidates for ${position.title} is invalid.`, 400);
      }
    }
  }

  const castAt = new Date();
  const referenceNumber = generateVoteReferenceNumber();
  const voteRows = input.selections.flatMap((selection) =>
    selection.candidateIds.map((candidateId) => ({
      electionId: token.electionId,
      positionId: selection.positionId,
      candidateId,
      voterId: token.voterId,
      referenceNumber,
      castAt,
    }))
  );
  const candidateIds = voteRows.map((row) => row.candidateId);
  const abstainedPositionIds = input.selections.filter((s) => s.candidateIds.length === 0).map((s) => s.positionId);

  await prisma.$transaction(async (tx) => {
    // Share-lock the election row for the duration of this ballot. closeElection/lockElection take an
    // exclusive row lock when they update the election, so a vote is either fully committed before the
    // election closes (and therefore inside the certified snapshot) or sees the closed/locked state here
    // and is rejected — never counted after certification.
    await tx.$queryRaw`SELECT id FROM elections WHERE id = ${token.electionId} FOR SHARE`;
    const live = await tx.election.findUniqueOrThrow({
      where: { id: token.electionId },
      select: { status: true, isLocked: true },
    });
    if (live.status !== 'ACTIVE') {
      throw new AppError('Voting is not currently open for this election.', 409);
    }
    if (live.isLocked) {
      throw new AppError('This election is locked. Voting is temporarily unavailable.', 423);
    }

    // Serialise with every link operation for this voter, then refuse if they have ALREADY voted on any link
    // (covers stale/duplicate links minted before this guard existed). One voter, one ballot.
    await lockVoterRow(tx, token.voterId);
    const alreadyVoted = await tx.votingToken.findFirst({ where: { voterId: token.voterId, status: 'CONSUMED' }, select: { id: true } });
    if (alreadyVoted) {
      throw new AppError('This voter has already voted. This voting link is no longer valid.', 410);
    }

    const claimed = await tx.votingToken.updateMany({
      where: { id: token.id, status: 'ISSUED' },
      data: { status: 'CONSUMED', consumedAt: castAt },
    });
    if (claimed.count === 0) {
      throw new AppError('This voting link has already been used.', 410);
    }
    // Any other outstanding link for this voter is now void.
    await tx.votingToken.updateMany({
      where: { voterId: token.voterId, status: 'ISSUED', id: { not: token.id } },
      data: { status: 'REVOKED', revokedAt: castAt },
    });

    if (voteRows.length > 0) {
      await tx.vote.createMany({ data: voteRows });
    }

    await tx.voter.update({ where: { id: token.voterId }, data: { votingStatus: 'VOTED' } });

    await recordVoteInTallies(tx, token.electionId, { candidateIds, abstainedPositionIds, castAt });
    // maxWait: when many voters submit at once, wait in the connection queue rather than failing with
    // "Unable to start a transaction in the given time" (Prisma's default is only 2 s). A failed start
    // consumes nothing - the token stays valid - but waiting is a far better voter experience.
  }, { maxWait: 20000, timeout: 20000 });

  await writeAuditLog({
    action: 'VOTE_CAST',
    actorId: token.voterId,
    actorRole: 'VOTER',
    actorName: token.voter.fullName,
    targetType: 'VOTING_TOKEN',
    targetId: token.id,
    electionId: token.electionId,
    metadata: { referenceNumber, positionsVoted: input.selections.filter((s) => s.candidateIds.length > 0).length },
    req,
  });

  return { referenceNumber };
}

// ---------------------------------------------------------------------------
// Individual vote records — ELECTION_COMMITTEE / SUPER_ADMIN only. Never exposed via exports,
// public APIs, or dashboard widgets. Every read is itself audit-logged (see controller).
// ---------------------------------------------------------------------------

export async function listVoteRecords(electionId: string, query: VoteRecordsQuery) {
  const reference = query.search ? normalizeReference(query.search) : '';
  const where = {
    electionId,
    ...(query.search
      ? {
          OR: [
            { voter: { fullName: { contains: query.search, mode: 'insensitive' as const } } },
            { voter: { membershipNumber: { contains: query.search, mode: 'insensitive' as const } } },
            // A full or partial receipt number, typed with or without dashes/spaces.
            ...(reference.length >= 4 ? [{ referenceNumber: { contains: reference } }] : []),
          ],
        }
      : {}),
  };

  const [total, votes] = await prisma.$transaction([
    prisma.vote.count({ where }),
    prisma.vote.findMany({
      where,
      orderBy: { castAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        voter: { select: { fullName: true, membershipNumber: true } },
        position: { select: { title: true } },
        candidate: { select: { name: true } },
      },
    }),
  ]);

  return {
    records: votes.map((v) => ({
      id: v.id,
      voterName: v.voter.fullName,
      membershipNumber: v.voter.membershipNumber,
      position: v.position.title,
      candidate: v.candidate.name,
      castAt: v.castAt,
      referenceNumber: v.referenceNumber,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * Receipt numbers as voters read them out: any case, spaces or missing dashes. "ida 7kq4m2xp9hta"
 * becomes "IDA-7KQ4-M2XP-9HTA"; anything that isn't a whole receipt is returned upper-cased with
 * spaces removed, so partial searches still work.
 */
export function normalizeReference(input: string): string {
  const compact = input.toUpperCase().replace(/[\s\-_.]/g, '');
  const whole = compact.match(/^([A-Z]{2,10}?)([A-Z0-9]{4})([A-Z0-9]{4})([A-Z0-9]{4})$/);
  if (whole) return `${whole[1]}-${whole[2]}-${whole[3]}-${whole[4]}`;
  return input.toUpperCase().replace(/\s+/g, '');
}

export interface ReceiptCheck {
  found: boolean;
  referenceNumber: string;
  election?: { id: string; title: string; year: number; isCurrent: boolean };
  voter?: { fullName: string; membershipNumber: string };
  castAt?: Date;
  contestsVoted?: number;
  contestsAbstained?: number;
  /** Every voting link this voter was given in that election, oldest first. */
  linkHistory?: {
    status: string;
    issuedAt: Date;
    firstOpenedAt: Date | null;
    usedAt: Date | null;
    revokedAt: Date | null;
    usedForThisBallot: boolean;
  }[];
}

/**
 * "Is this receipt genuine?" for the committee settling a dispute. Says whether a ballot with this
 * reference exists, whose it is, when it was cast and the voter's link history, but never the choices:
 * those stay on the Vote Records screen. Every check is audit-logged, found or not.
 */
export async function verifyReceipt(currentElectionId: string, rawReference: string, actor: Actor, req?: import('express').Request): Promise<ReceiptCheck> {
  const referenceNumber = normalizeReference(rawReference);
  const votes = await prisma.vote.findMany({
    where: { referenceNumber },
    select: { electionId: true, voterId: true, positionId: true, castAt: true },
  });

  let result: ReceiptCheck = { found: false, referenceNumber };
  if (votes.length > 0) {
    const { electionId, voterId } = votes[0];
    const castAt = votes.reduce((min, v) => (v.castAt < min ? v.castAt : min), votes[0].castAt);
    const [election, voter, positionCount, tokens] = await Promise.all([
      prisma.election.findUniqueOrThrow({ where: { id: electionId }, select: { id: true, title: true, year: true } }),
      prisma.voter.findUniqueOrThrow({ where: { id: voterId }, select: { fullName: true, membershipNumber: true } }),
      prisma.position.count({ where: { electionId } }),
      prisma.votingToken.findMany({
        where: { voterId, electionId },
        orderBy: { issuedAt: 'asc' },
        select: { status: true, issuedAt: true, firstAccessedAt: true, consumedAt: true, revokedAt: true },
      }),
    ]);
    const contestsVoted = new Set(votes.map((v) => v.positionId)).size;
    result = {
      found: true,
      referenceNumber,
      election: { ...election, isCurrent: election.id === currentElectionId },
      voter,
      castAt,
      contestsVoted,
      contestsAbstained: Math.max(0, positionCount - contestsVoted),
      linkHistory: tokens.map((t) => ({
        status: t.status,
        issuedAt: t.issuedAt,
        firstOpenedAt: t.firstAccessedAt,
        usedAt: t.consumedAt,
        revokedAt: t.revokedAt,
        usedForThisBallot: t.status === 'CONSUMED',
      })),
    };
  }

  await writeAuditLog({
    action: result.found ? 'RECEIPT_VERIFIED' : 'RECEIPT_NOT_FOUND',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTE_RECEIPT',
    electionId: result.election?.id ?? currentElectionId,
    metadata: { referenceNumber, ...(rawReference.trim() !== referenceNumber ? { typed: rawReference.trim().slice(0, 60) } : {}) },
    req,
  });

  return result;
}

export async function logVoteRecordsAccess(
  electionId: string,
  actor: Actor,
  query: VoteRecordsQuery,
  req?: import('express').Request
) {
  await writeAuditLog({
    action: 'VOTE_RECORDS_VIEWED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    electionId,
    metadata: { search: query.search, page: query.page, pageSize: query.pageSize },
    req,
  });
}
