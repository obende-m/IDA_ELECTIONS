import { prisma } from '../../lib/prisma';
import { getCurrentElection } from '../../lib/election';
import { AppError } from '../../middleware/errorHandler';
import { writeAuditLog } from '../../lib/audit';
import type { AdminRole } from '../auth/auth.service';

export interface Actor {
  id: string;
  fullName: string;
  role: AdminRole;
}

export async function getCurrentElectionDetail() {
  const current = await getCurrentElection();
  return prisma.election.findUniqueOrThrow({
    where: { id: current.id },
    include: {
      lockedBy: { select: { id: true, fullName: true } },
      unlockedBy: { select: { id: true, fullName: true } },
    },
  });
}

/** Ends voting and automatically locks the election — the point at which results become final. */
export async function closeElection(actor: Actor, req?: import('express').Request) {
  const election = await getCurrentElection();
  if (election.status === 'CLOSED') {
    throw new AppError('This election is already closed.', 409);
  }

  const updated = await prisma.election.update({
    where: { id: election.id },
    data: { status: 'CLOSED', isLocked: true, lockedAt: new Date(), lockedById: actor.id },
  });

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
