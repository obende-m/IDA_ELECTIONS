import { prisma } from './prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Guards every mutation that must be impossible once an election is locked: votes, token
 * issue/revoke, voter records, candidate/position records, and election configuration itself.
 * 423 (Locked) is the correct HTTP semantic for "the resource cannot be modified right now."
 */
export async function assertElectionNotLocked(electionId: string): Promise<void> {
  const election = await prisma.election.findUnique({ where: { id: electionId }, select: { isLocked: true } });
  if (election?.isLocked) {
    throw new AppError('This election is locked and cannot be modified. A Super Admin must unlock it first.', 423);
  }
}
