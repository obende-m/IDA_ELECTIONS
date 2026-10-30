import type { Prisma, Voter, VotingToken } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { generateOpaqueToken, hashToken } from '../../lib/tokens';
import { encryptToken, decryptToken } from '../../lib/crypto';
import { writeAuditLog } from '../../lib/audit';
import { assertElectionNotLocked } from '../../lib/electionLock';
import type { Actor } from '../../lib/actor';
import type { CreateVoterInput, ListVotersQuery, UpdateVoterInput } from './voter.validation';

export type { Actor };

function votingLinkFor(rawToken: string): string {
  const base = process.env.VOTING_LINK_BASE_URL ?? 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/vote/${rawToken}`;
}

// ---------------------------------------------------------------------------
// Voter CRUD
// ---------------------------------------------------------------------------

export async function listVoters(electionId: string, query: ListVotersQuery) {
  const where: Prisma.VoterWhereInput = {
    electionId,
    ...(query.status === 'active' ? { isActive: true } : {}),
    ...(query.status === 'inactive' ? { isActive: false } : {}),
    ...(query.votingStatus ? { votingStatus: query.votingStatus } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { membershipNumber: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, voters] = await prisma.$transaction([
    prisma.voter.count({ where }),
    prisma.voter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { voters, total, page: query.page, pageSize: query.pageSize };
}

/** Full (unpaginated) roster for "Export voter list" — never includes token/link data. */
export async function exportVoters(electionId: string, query: Pick<ListVotersQuery, 'search' | 'status' | 'votingStatus'>) {
  const where: Prisma.VoterWhereInput = {
    electionId,
    ...(query.status === 'active' ? { isActive: true } : {}),
    ...(query.status === 'inactive' ? { isActive: false } : {}),
    ...(query.votingStatus ? { votingStatus: query.votingStatus } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { membershipNumber: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  return prisma.voter.findMany({ where, orderBy: { fullName: 'asc' } });
}

export async function getVoter(electionId: string, voterId: string): Promise<Voter> {
  const voter = await prisma.voter.findFirst({ where: { id: voterId, electionId } });
  if (!voter) throw new AppError('Voter not found', 404);
  return voter;
}

export async function createVoter(electionId: string, input: CreateVoterInput, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);

  const existing = await prisma.voter.findUnique({
    where: { electionId_membershipNumber: { electionId, membershipNumber: input.membershipNumber } },
  });
  if (existing) throw new AppError('A voter with this membership number already exists', 409);

  const voter = await prisma.voter.create({
    data: {
      electionId,
      membershipNumber: input.membershipNumber,
      fullName: input.fullName,
      email: input.email || undefined,
      phone: input.phone || undefined,
      ward: input.ward || undefined,
      isActive: input.isActive ?? true,
    },
  });

  await writeAuditLog({
    action: 'VOTER_CREATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTER',
    targetId: voter.id,
    electionId,
    req,
  });

  return voter;
}

export async function updateVoter(
  electionId: string,
  voterId: string,
  input: UpdateVoterInput,
  actor: Actor,
  req?: import('express').Request
) {
  await assertElectionNotLocked(electionId);
  const voter = await getVoter(electionId, voterId);

  const updated = await prisma.voter.update({
    where: { id: voter.id },
    data: {
      ...(input.membershipNumber !== undefined ? { membershipNumber: input.membershipNumber } : {}),
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.ward !== undefined ? { ward: input.ward || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  await writeAuditLog({
    action: 'VOTER_UPDATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTER',
    targetId: voter.id,
    electionId,
    metadata: { changes: input },
    req,
  });

  return updated;
}

export async function setVoterActive(
  electionId: string,
  voterId: string,
  isActive: boolean,
  actor: Actor,
  req?: import('express').Request
) {
  await assertElectionNotLocked(electionId);
  const voter = await getVoter(electionId, voterId);
  const updated = await prisma.voter.update({ where: { id: voter.id }, data: { isActive } });

  await writeAuditLog({
    action: isActive ? 'VOTER_ACTIVATED' : 'VOTER_DEACTIVATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTER',
    targetId: voter.id,
    electionId,
    req,
  });

  return updated;
}

/**
 * Only allowed while a voter has never had a token issued (votingStatus NOT_ISSUED) — once a
 * token exists, VotingToken/Vote rows cascade-delete with the Voter (onDelete: Cascade in the
 * schema), which would destroy real election history. Deactivate is the correct action past that
 * point; this is only for cleaning up a voter added by mistake before anything happened to them.
 */
export async function deleteVoter(electionId: string, voterId: string, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);
  const voter = await getVoter(electionId, voterId);

  if (voter.votingStatus !== 'NOT_ISSUED') {
    throw new AppError('This voter has already been issued a voting token and cannot be deleted — deactivate them instead.', 409);
  }

  await prisma.voter.delete({ where: { id: voter.id } });

  await writeAuditLog({
    action: 'VOTER_DELETED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTER',
    targetId: voter.id,
    electionId,
    metadata: { fullName: voter.fullName, membershipNumber: voter.membershipNumber },
    req,
  });
}

// ---------------------------------------------------------------------------
// Token lifecycle (immutable: issue, revoke, replace-by-issuing-new — never mutate in place)
// ---------------------------------------------------------------------------

type DbClient = Prisma.TransactionClient | typeof prisma;

async function createTokenRow(
  db: DbClient,
  electionId: string,
  voterId: string,
  issuedById: string,
  replacesTokenId?: string
): Promise<{ token: VotingToken; rawToken: string }> {
  const rawToken = generateOpaqueToken();
  const token = await db.votingToken.create({
    data: {
      electionId,
      voterId,
      tokenHash: hashToken(rawToken),
      tokenEncrypted: encryptToken(rawToken),
      issuedById,
      replacesTokenId,
    },
  });
  await db.voter.update({ where: { id: voterId }, data: { votingStatus: 'ISSUED' } });
  return { token, rawToken };
}

const ALREADY_VOTED_MESSAGE = 'This voter has already voted, so no new voting link can be issued.';

/** Serialises every token operation (and the vote itself) for one voter: two admins, or an admin and the voter, can never interleave. */
export async function lockVoterRow(tx: Prisma.TransactionClient, voterId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM voters WHERE id = ${voterId} FOR UPDATE`;
}

/** A voter who has cast a ballot (a CONSUMED token exists) can never be issued another link. */
async function assertVoterHasNotVoted(db: DbClient, voterId: string): Promise<void> {
  const [consumed, voter] = await Promise.all([
    db.votingToken.findFirst({ where: { voterId, status: 'CONSUMED' }, select: { id: true } }),
    db.voter.findUnique({ where: { id: voterId }, select: { votingStatus: true } }),
  ]);
  if (consumed || voter?.votingStatus === 'VOTED') throw new AppError(ALREADY_VOTED_MESSAGE, 409);
}

/** Records a refused attempt (someone tried to mint a link for a voter who already voted) before surfacing the error. */
async function auditBlockedIssue(electionId: string, voterId: string, actor: Actor, attempt: string, req?: import('express').Request) {
  await writeAuditLog({
    action: 'TOKEN_ISSUE_BLOCKED_ALREADY_VOTED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTER',
    targetId: voterId,
    electionId,
    metadata: { attempt },
    req,
  });
}

export async function issueToken(electionId: string, voterId: string, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);
  const voter = await getVoter(electionId, voterId);

  let created: { token: VotingToken; rawToken: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      await lockVoterRow(tx, voter.id);
      await assertVoterHasNotVoted(tx, voter.id);
      const activeToken = await tx.votingToken.findFirst({ where: { voterId: voter.id, status: 'ISSUED' } });
      if (activeToken) {
        throw new AppError('This voter already has an active token. Use "Issue New Token" to replace it.', 409);
      }
      return createTokenRow(tx, electionId, voter.id, actor.id);
    });
  } catch (err) {
    if (err instanceof AppError && err.message === ALREADY_VOTED_MESSAGE) await auditBlockedIssue(electionId, voter.id, actor, 'issue', req);
    throw err;
  }
  const { token, rawToken } = created;

  await writeAuditLog({
    action: 'TOKEN_ISSUED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTING_TOKEN',
    targetId: token.id,
    electionId,
    metadata: { voterId: voter.id },
    req,
  });

  return { token, votingLink: votingLinkFor(rawToken) };
}

export async function revokeToken(electionId: string, voterId: string, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);
  const voter = await getVoter(electionId, voterId);
  const activeToken = await prisma.votingToken.findFirst({ where: { voterId: voter.id, status: 'ISSUED' } });
  if (!activeToken) throw new AppError('This voter has no active token to revoke', 409);

  const revoked = await prisma.$transaction(async (tx) => {
    const updated = await tx.votingToken.update({
      where: { id: activeToken.id },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actor.id },
    });
    await tx.voter.update({ where: { id: voter.id }, data: { votingStatus: 'REVOKED' } });
    return updated;
  });

  await writeAuditLog({
    action: 'TOKEN_REVOKED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTING_TOKEN',
    targetId: revoked.id,
    electionId,
    metadata: { voterId: voter.id },
    req,
  });

  return revoked;
}

/** "Issue New Token" admin action: atomically revokes any current active token, then issues a fresh one. Never touches a CONSUMED token. */
export async function replaceToken(electionId: string, voterId: string, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);
  const voter = await getVoter(electionId, voterId);

  let result: { token: VotingToken; rawToken: string; revokedIds: string[] };
  try {
    result = await prisma.$transaction(async (tx) => {
      await lockVoterRow(tx, voter.id);
      await assertVoterHasNotVoted(tx, voter.id);

      // Void EVERY outstanding link for this voter, then issue exactly one new one: the old link(s) stop working immediately.
      const outstanding = await tx.votingToken.findMany({ where: { voterId: voter.id, status: 'ISSUED' }, orderBy: { issuedAt: 'desc' }, select: { id: true } });
      if (outstanding.length > 0) {
        await tx.votingToken.updateMany({
          where: { id: { in: outstanding.map((t) => t.id) } },
          data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actor.id },
        });
      }
      const { token, rawToken } = await createTokenRow(tx, electionId, voter.id, actor.id, outstanding[0]?.id);
      return { token, rawToken, revokedIds: outstanding.map((t) => t.id) };
    });
  } catch (err) {
    if (err instanceof AppError && err.message === ALREADY_VOTED_MESSAGE) await auditBlockedIssue(electionId, voter.id, actor, 'replace', req);
    throw err;
  }

  for (const revokedId of result.revokedIds) {
    await writeAuditLog({
      action: 'TOKEN_REVOKED',
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.fullName,
      targetType: 'VOTING_TOKEN',
      targetId: revokedId,
      electionId,
      metadata: { voterId: voter.id, reason: 'replaced' },
      req,
    });
  }
  await writeAuditLog({
    action: 'TOKEN_REPLACEMENT_ISSUED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'VOTING_TOKEN',
    targetId: result.token.id,
    electionId,
    metadata: { voterId: voter.id, replacesTokenId: result.revokedIds[0] },
    req,
  });

  return { token: result.token, votingLink: votingLinkFor(result.rawToken) };
}

/** Returns the current active token's voting link for display/copy, decrypting on demand. Never used for verification. */
export async function getCurrentVotingLink(electionId: string, voterId: string): Promise<string | null> {
  const voter = await getVoter(electionId, voterId);
  const activeToken = await prisma.votingToken.findFirst({ where: { voterId: voter.id, status: 'ISSUED' } });
  if (!activeToken) return null;
  return votingLinkFor(decryptToken(activeToken.tokenEncrypted));
}

export interface VoterLinkRow {
  membershipNumber: string;
  fullName: string;
  votingStatus: Voter['votingStatus'];
  votingLink: string | null;
}

/** Full roster export for "Download all voting links" — one row per active voter in the election. */
export async function listAllVotingLinks(electionId: string): Promise<VoterLinkRow[]> {
  const voters = await prisma.voter.findMany({
    where: { electionId, isActive: true },
    orderBy: { fullName: 'asc' },
    include: { tokens: { where: { status: 'ISSUED' }, take: 1 } },
  });

  return voters.map((voter) => ({
    membershipNumber: voter.membershipNumber,
    fullName: voter.fullName,
    votingStatus: voter.votingStatus,
    votingLink: voter.tokens[0] ? votingLinkFor(decryptToken(voter.tokens[0].tokenEncrypted)) : null,
  }));
}

export interface TokenResolution {
  voterId: string;
  fullName: string;
  membershipNumber: string;
  status: 'ISSUED' | 'CONSUMED' | 'REVOKED';
}

type TokenWithVoter = VotingToken & { voter: Voter };

/**
 * Shared validation for every public voter-token entry point (resolve, fetch ballot, cast vote):
 * looks the token up, rejects anything not currently ISSUED, and audit-logs every denied attempt.
 * Does not mark the token as accessed — callers decide whether that applies to them.
 */
export async function getValidToken(rawToken: string, req?: import('express').Request): Promise<TokenWithVoter> {
  const token = await prisma.votingToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { voter: true },
  });

  if (!token) {
    await writeAuditLog({ action: 'TOKEN_ACCESS_DENIED', actorRole: 'VOTER', metadata: { reason: 'INVALID' }, req });
    throw new AppError('This voting link is invalid.', 404);
  }

  if (token.status === 'REVOKED') {
    await writeAuditLog({
      action: 'TOKEN_ACCESS_DENIED',
      actorId: token.voterId,
      actorRole: 'VOTER',
      actorName: token.voter.fullName,
      targetType: 'VOTING_TOKEN',
      targetId: token.id,
      electionId: token.electionId,
      metadata: { reason: 'REVOKED' },
      req,
    });
    throw new AppError('This voting link has been revoked. Please contact the Electoral Committee for a new one.', 410);
  }

  if (token.status === 'CONSUMED') {
    await writeAuditLog({
      action: 'TOKEN_ACCESS_DENIED',
      actorId: token.voterId,
      actorRole: 'VOTER',
      actorName: token.voter.fullName,
      targetType: 'VOTING_TOKEN',
      targetId: token.id,
      electionId: token.electionId,
      metadata: { reason: 'ALREADY_CONSUMED' },
      req,
    });
    throw new AppError('This voting link has already been used.', 410);
  }

  if (token.expiresAt && token.expiresAt < new Date()) {
    await writeAuditLog({
      action: 'TOKEN_ACCESS_DENIED',
      actorId: token.voterId,
      actorRole: 'VOTER',
      actorName: token.voter.fullName,
      targetType: 'VOTING_TOKEN',
      targetId: token.id,
      electionId: token.electionId,
      metadata: { reason: 'EXPIRED' },
      req,
    });
    throw new AppError('This voting link has expired.', 410);
  }

  return token;
}

/** Public entry point when a voter opens their personal /vote/:token link. Marks first access and logs every attempt, valid or not. */
export async function resolveVotingToken(rawToken: string, req?: import('express').Request): Promise<TokenResolution> {
  const token = await getValidToken(rawToken, req);

  if (!token.firstAccessedAt) {
    await prisma.votingToken.update({ where: { id: token.id }, data: { firstAccessedAt: new Date() } });
  }

  await writeAuditLog({
    action: 'TOKEN_ACCESSED',
    actorId: token.voterId,
    actorRole: 'VOTER',
    targetType: 'VOTING_TOKEN',
    targetId: token.id,
    electionId: token.electionId,
    req,
  });

  return {
    voterId: token.voter.id,
    fullName: token.voter.fullName,
    membershipNumber: token.voter.membershipNumber,
    status: token.status,
  };
}
