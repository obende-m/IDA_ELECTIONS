import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { writeAuditLog } from '../../lib/audit';
import { assertElectionNotLocked } from '../../lib/electionLock';
import { assertNoVotesForPosition } from '../../lib/voteIntegrity';
import type { Actor } from '../../lib/actor';
import type { CreatePositionInput, UpdatePositionInput } from './position.validation';

export async function listPositions(electionId: string) {
  return prisma.position.findMany({
    where: { electionId },
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { candidates: true } } },
  });
}

export async function getPosition(electionId: string, positionId: string) {
  const position = await prisma.position.findFirst({ where: { id: positionId, electionId } });
  if (!position) throw new AppError('Position not found', 404);
  return position;
}

export async function createPosition(electionId: string, input: CreatePositionInput, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);

  const displayOrder = input.displayOrder ?? (await prisma.position.count({ where: { electionId } }));

  const position = await prisma.$transaction(async (tx) => {
    const created = await tx.position.create({
      data: {
        electionId,
        title: input.title,
        description: input.description || undefined,
        maxSelections: input.maxSelections,
        displayOrder,
      },
    });
    // Paired 1:1 tally row, created here (not lazily) so analytics.service.ts never has to
    // special-case "position exists but has no tally row yet" — see analytics.service.ts.
    await tx.positionTally.create({ data: { electionId, positionId: created.id } });
    return created;
  });

  await writeAuditLog({
    action: 'POSITION_CREATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'POSITION',
    targetId: position.id,
    electionId,
    req,
  });

  return position;
}

export async function updatePosition(
  electionId: string,
  positionId: string,
  input: UpdatePositionInput,
  actor: Actor,
  req?: import('express').Request
) {
  await assertElectionNotLocked(electionId);
  const position = await getPosition(electionId, positionId);

  const updated = await prisma.position.update({
    where: { id: position.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.maxSelections !== undefined ? { maxSelections: input.maxSelections } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
    },
  });

  await writeAuditLog({
    action: 'POSITION_UPDATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'POSITION',
    targetId: position.id,
    electionId,
    metadata: { changes: input },
    req,
  });

  return updated;
}

export async function deletePosition(electionId: string, positionId: string, actor: Actor, req?: import('express').Request) {
  await assertElectionNotLocked(electionId);
  const position = await getPosition(electionId, positionId);
  await assertNoVotesForPosition(position.id);

  await prisma.position.delete({ where: { id: position.id } });

  await writeAuditLog({
    action: 'POSITION_DELETED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'POSITION',
    targetId: position.id,
    electionId,
    metadata: { title: position.title },
    req,
  });
}
