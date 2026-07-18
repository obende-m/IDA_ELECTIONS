import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { writeAuditLog } from '../../lib/audit';
import { assertElectionNotLocked } from '../../lib/electionLock';
import { assertNoVotesForCandidate } from '../../lib/voteIntegrity';
import { uploadCandidatePhoto, removeCandidatePhoto as deleteStoredPhoto } from '../../lib/storage';
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

  const candidate = await prisma.$transaction(async (tx) => {
    const created = await tx.candidate.create({
      data: {
        electionId,
        positionId: input.positionId,
        name: input.name,
        bio: input.bio || undefined,
        displayOrder,
      },
    });
    // Paired 1:1 tally row, created here (not lazily) so analytics.service.ts never has to
    // special-case "candidate exists but has no tally row yet" — see analytics.service.ts.
    await tx.candidateTally.create({
      data: { electionId, candidateId: created.id, positionId: created.positionId },
    });
    return created;
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

  const isReassigning = input.positionId !== undefined && input.positionId !== candidate.positionId;
  if (isReassigning) {
    // A candidate's position must be stable once votes exist — CandidateTally.positionId (and every
    // analytics rollup keyed on it) trusts this. deleteCandidate already enforces the same rule.
    await assertNoVotesForCandidate(candidate.id);
    await assertPositionBelongsToElection(electionId, input.positionId!);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.candidate.update({
      where: { id: candidate.id },
      data: {
        ...(input.positionId !== undefined ? { positionId: input.positionId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      },
    });
    if (isReassigning) {
      await tx.candidateTally.update({ where: { candidateId: candidate.id }, data: { positionId: input.positionId! } });
    }
    return result;
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

export async function setCandidatePhoto(
  electionId: string,
  candidateId: string,
  file: { buffer: Buffer; mimetype: string },
  actor: Actor,
  req?: import('express').Request
) {
  await assertElectionNotLocked(electionId);
  const candidate = await getCandidate(electionId, candidateId);

  const photoUrl = await uploadCandidatePhoto(candidate.id, file.buffer, file.mimetype);
  const updated = await prisma.candidate.update({ where: { id: candidate.id }, data: { photoUrl } });

  await writeAuditLog({
    action: 'CANDIDATE_PHOTO_UPLOADED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'CANDIDATE',
    targetId: candidate.id,
    electionId,
    req,
  });

  return updated;
}

export async function removeCandidatePhoto(electionId: string, candidateId: string, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);
  const candidate = await getCandidate(electionId, candidateId);

  await deleteStoredPhoto(candidate.id);
  const updated = await prisma.candidate.update({ where: { id: candidate.id }, data: { photoUrl: null } });

  await writeAuditLog({
    action: 'CANDIDATE_PHOTO_REMOVED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'CANDIDATE',
    targetId: candidate.id,
    electionId,
    req,
  });

  return updated;
}
