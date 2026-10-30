import { prisma } from './prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Independent of the election lock: even while an election is unlocked and actively running,
 * deleting a position/candidate that already has cast votes would silently destroy those votes
 * via cascade. This guard blocks that regardless of lock state.
 */
/**
 * Once the first ballot is cast, the shape of the ballot (which positions exist, who stands, how many
 * seats) must not change: adding a candidate or position mid-vote would mean some voters saw a
 * different ballot from others.
 */
export async function assertBallotStructureEditable(electionId: string): Promise<void> {
  const tally = await prisma.electionTally.findUnique({ where: { electionId }, select: { ballotsCast: true } });
  if ((tally?.ballotsCast ?? 0) > 0) {
    throw new AppError('Voting has already started, so the ballot structure (positions, candidates, seat counts) is frozen.', 409);
  }
}

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
