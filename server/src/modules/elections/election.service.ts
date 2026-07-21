import { prisma } from '../../lib/prisma';
import { getCurrentElection } from '../../lib/election';
import { AppError } from '../../middleware/errorHandler';
import { writeAuditLog } from '../../lib/audit';
import { assertElectionNotLocked } from '../../lib/electionLock';
import { certifyElectionResults } from '../analytics/analytics.service';
import type { Actor } from '../../lib/actor';
import type { UpdateElectionInput } from './election.validation';

export async function getCurrentElectionDetail() {
  const current = await getCurrentElection();
  return prisma.election.findUniqueOrThrow({
    where: { id: current.id },
    include: {
      lockedBy: { select: { id: true, fullName: true } },
      unlockedBy: { select: { id: true, fullName: true } },
      _count: { select: { positions: true, voters: true } },
    },
  });
}

export async function updateCurrentElection(input: UpdateElectionInput, actor: Actor, req?: import('express').Request) {
  const election = await getCurrentElection();
  await assertElectionNotLocked(election.id);

  const updated = await prisma.election.update({
    where: { id: election.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.year !== undefined ? { year: input.year } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
    },
  });

  await writeAuditLog({
    action: 'ELECTION_UPDATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    metadata: { changes: input },
    req,
  });

  return updated;
}

/** DRAFT -> ACTIVE. Refuses to open a ballot with nothing on it. */
export async function openElection(actor: Actor, req?: import('express').Request) {
  const election = await getCurrentElection();
  await assertElectionNotLocked(election.id);

  if (election.status !== 'DRAFT' && election.status !== 'PAUSED') {
    throw new AppError(`Cannot open an election from ${election.status} status.`, 409);
  }

  const positionCount = await prisma.position.count({ where: { electionId: election.id } });
  if (positionCount === 0) {
    throw new AppError('Add at least one position before opening the election.', 409);
  }
  const candidateCount = await prisma.candidate.count({ where: { electionId: election.id } });
  if (candidateCount === 0) {
    throw new AppError('Add at least one candidate before opening the election.', 409);
  }

  const updated = await prisma.election.update({ where: { id: election.id }, data: { status: 'ACTIVE' } });

  await writeAuditLog({
    action: 'ELECTION_OPENED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    req,
  });

  return updated;
}

/** ACTIVE -> PAUSED. Voters see the "election paused" state; nothing already cast is affected. */
export async function pauseElection(actor: Actor, req?: import('express').Request) {
  const election = await getCurrentElection();
  await assertElectionNotLocked(election.id);

  if (election.status !== 'ACTIVE') {
    throw new AppError('Only an active election can be paused.', 409);
  }

  const updated = await prisma.election.update({ where: { id: election.id }, data: { status: 'PAUSED' } });

  await writeAuditLog({
    action: 'ELECTION_PAUSED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    req,
  });

  return updated;
}

/** PAUSED -> ACTIVE. */
export async function resumeElection(actor: Actor, req?: import('express').Request) {
  const election = await getCurrentElection();
  await assertElectionNotLocked(election.id);

  if (election.status !== 'PAUSED') {
    throw new AppError('Only a paused election can be resumed.', 409);
  }

  const updated = await prisma.election.update({ where: { id: election.id }, data: { status: 'ACTIVE' } });

  await writeAuditLog({
    action: 'ELECTION_RESUMED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    req,
  });

  return updated;
}

/** CLOSED -> ARCHIVED. Allowed even while locked — archiving only changes organizational status, never results. */
export async function archiveElection(actor: Actor, req?: import('express').Request) {
  const election = await getCurrentElection();

  if (election.status !== 'CLOSED') {
    throw new AppError('Only a closed election can be archived.', 409);
  }

  const updated = await prisma.election.update({ where: { id: election.id }, data: { status: 'ARCHIVED' } });

  await writeAuditLog({
    action: 'ELECTION_ARCHIVED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    req,
  });

  return updated;
}

/**
 * Ends voting and automatically locks the election — the point at which results become final.
 * Locking the election row and certifying its final analytics snapshot happen in one transaction
 * (mirrors castVote's mutate-in-tx-then-log-after-commit pattern) so it's never possible to end up
 * with a CLOSED election and no certified snapshot from a mid-write failure.
 */
export async function closeElection(actor: Actor, req?: import('express').Request) {
  const election = await getCurrentElection();
  if (election.status === 'CLOSED') {
    throw new AppError('This election is already closed.', 409);
  }

  const updated = await prisma.$transaction(
    async (tx) => {
      const result = await tx.election.update({
        where: { id: election.id },
        data: { status: 'CLOSED', isLocked: true, lockedAt: new Date(), lockedById: actor.id },
      });
      await certifyElectionResults(tx, election.id, actor.id);
      return result;
    },
    // Default 5s interactive-transaction timeout is too tight for certifyElectionResults' read
    // fan-out (positions/candidates/activity/audit log) over the network to Supabase's pooler.
    { timeout: 15000 }
  );

  await writeAuditLog({
    action: 'ELECTION_CLOSED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    req,
  });
  await writeAuditLog({
    action: 'ELECTION_LOCKED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    metadata: { reason: 'election_closed' },
    req,
  });
  await writeAuditLog({
    action: 'ELECTION_RESULTS_CERTIFIED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    req,
  });

  return updated;
}

/** Manual/emergency lock — can be triggered at any time, independent of election status. */
export async function lockElection(actor: Actor, reason: string, req?: import('express').Request) {
  const election = await getCurrentElection();
  if (election.isLocked) {
    throw new AppError('This election is already locked.', 409);
  }

  const updated = await prisma.election.update({
    where: { id: election.id },
    data: { isLocked: true, lockedAt: new Date(), lockedById: actor.id },
  });

  await writeAuditLog({
    action: 'ELECTION_LOCKED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    metadata: { reason },
    req,
  });

  return updated;
}

/** SUPER_ADMIN only (enforced at the route level). A mandatory reason is required for the audit trail. */
export async function unlockElection(actor: Actor, reason: string, req?: import('express').Request) {
  const election = await getCurrentElection();
  if (!election.isLocked) {
    throw new AppError('This election is not locked.', 409);
  }

  const updated = await prisma.election.update({
    where: { id: election.id },
    data: { isLocked: false, unlockedAt: new Date(), unlockedById: actor.id },
  });

  await writeAuditLog({
    action: 'ELECTION_UNLOCKED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    metadata: { reason },
    req,
  });

  return updated;
}
