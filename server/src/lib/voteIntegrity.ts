import { prisma } from './prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Independent of the election lock: even while an election is unlocked and actively running,
 * deleting a position/candidate that already has cast votes would silently destroy those votes
 * via cascade. This guard blocks that regardless of lock state.
 */
export async function assertNoVotesForPosition(positionId: string): Promise<void> {
  const count = await prisma.vote.count({ where: { positionId } });
  if (count > 0) {
    throw new AppError('This position already has votes recorded and cannot be deleted.', 409);
  }
}

export async function assertNoVotesForCandidate(candidateId: string): Promise<void> {
  const count = await prisma.vote.count({ where: { candidateId } });
  if (count > 0) {
    throw new AppError('This candidate already has votes recorded and cannot be deleted.', 409);
  }
}
