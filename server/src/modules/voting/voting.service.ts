import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { writeAuditLog } from '../../lib/audit';
import { generateVoteReferenceNumber } from '../../lib/voteReference';
import { getValidToken } from '../voters/voter.service';
import type { CastVoteInput, VoteRecordsQuery } from './voting.validation';
import type { Actor } from '../../lib/actor';

export async function getBallot(rawToken: string, req?: import('express').Request) {
  const token = await getValidToken(rawToken, req);

  const election = await prisma.election.findUniqueOrThrow({ where: { id: token.electionId } });
  if (election.status !== 'ACTIVE') {
    throw new AppError('Voting is not currently open for this election.', 409);
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

  const election = await prisma.election.findUniqueOrThrow({ where: { id: token.electionId } });
  if (election.status !== 'ACTIVE') {
    throw new AppError('Voting is not currently open for this election.', 409);
  }
  if (election.isLocked) {
    throw new AppError('This election is locked. Voting is temporarily unavailable.', 423);
  }

  const positions = await prisma.position.findMany({
    where: { electionId: token.electionId },
    include: { candidates: { select: { id: true } } },
  });
  const positionMap = new Map(positions.map((p) => [p.id, p]));

  for (const selection of input.selections) {
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

  const referenceNumber = generateVoteReferenceNumber();
  const voteRows = input.selections.flatMap((selection) =>
    selection.candidateIds.map((candidateId) => ({
      electionId: token.electionId,
      positionId: selection.positionId,
      candidateId,
      voterId: token.voterId,
      referenceNumber,
    }))
  );

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.votingToken.updateMany({
      where: { id: token.id, status: 'ISSUED' },
      data: { status: 'CONSUMED', consumedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new AppError('This voting link has already been used.', 410);
    }

    if (voteRows.length > 0) {
      await tx.vote.createMany({ data: voteRows });
    }

    await tx.voter.update({ where: { id: token.voterId }, data: { votingStatus: 'VOTED' } });
  });

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
  const where = {
    electionId,
    ...(query.search
      ? {
          voter: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { membershipNumber: { contains: query.search, mode: 'insensitive' as const } },
            ],
          },
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
