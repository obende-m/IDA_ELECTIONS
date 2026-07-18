import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { writeAuditLog } from '../../lib/audit';
import { assertElectionNotLocked } from '../../lib/electionLock';
import { assertNoVotesForCandidate } from '../../lib/voteIntegrity';
import type { Actor } from '../../lib/actor';
import type { CreateCandidateInput, UpdateCandidateInput } from './candidate.validation';

export interface CandidateListQuery {
  positionId?: string;
}

export async function listCandidates(electionId: string, query: CandidateListQuery) {
  return prisma.candidate.findMany({
    where: { electionId, ...(query.positionId ? { positionId: query.positionId } : {}) },
    orderBy: [{ positionId: 'asc' }, { displayOrder: 'asc' }],
    include: { position: { select: { id: true, title: true } } },
  });
}

export async function getCandidate(electionId: string, candidateId: string) {
  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, electionId } });
  if (!candidate) throw new AppError('Candidate not found', 404);
  return candidate;
}

async function assertPositionBelongsToElection(electionId: string, positionId: string) {
  const position = await prisma.position.findFirst({ where: { id: positionId, electionId } });
  if (!position) throw new AppError('Selected position does not belong to this election', 400);
}

export async function createCandidate(
  electionId: string,
  input: CreateCandidateInput,
  actor: Actor,
  req?: import('express').Request
) {
  await assertElectionNotLocked(electionId);
  await assertPositionBelongsToElection(electionId, input.positionId);

  const displayOrder = input.displayOrder ?? (await prisma.candidate.count({ where: { positionId: input.positionId } }));

  const candidate = await prisma.candidate.create({
    data: {
      electionId,
      positionId: input.positionId,
      name: input.name,
      bio: input.bio || undefined,
      photoUrl: input.photoUrl || undefined,
      displayOrder,
    },
  });

  await writeAuditLog({
    action: 'CANDIDATE_CREATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'CANDIDATE',
    targetId: candidate.id,
    electionId,
    req,
  });

  return candidate;
}

export async function updateCandidate(
  electionId: string,
  candidateId: string,
  input: UpdateCandidateInput,
  actor: Actor,
  req?: import('express').Request
) {
  await assertElectionNotLocked(electionId);
  const candidate = await getCandidate(electionId, candidateId);

  if (input.positionId !== undefined) {
    await assertPositionBelongsToElection(electionId, input.positionId);
  }

  const updated = await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      ...(input.positionId !== undefined ? { positionId: input.positionId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
    },
  });

  await writeAuditLog({
    action: 'CANDIDATE_UPDATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'CANDIDATE',
    targetId: candidate.id,
    electionId,
    metadata: { changes: input },
    req,
  });

  return updated;
}

export async function deleteCandidate(electionId: string, candidateId: string, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);
  const candidate = await getCandidate(electionId, candidateId);
  await assertNoVotesForCandidate(candidate.id);

  await prisma.candidate.delete({ where: { id: candidate.id } });

  await writeAuditLog({
    action: 'CANDIDATE_DELETED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'CANDIDATE',
    targetId: candidate.id,
    electionId,
    metadata: { name: candidate.name },
    req,
  });
}
