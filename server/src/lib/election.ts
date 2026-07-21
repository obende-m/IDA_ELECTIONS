import { prisma } from './prisma';
import { writeAuditLog } from './audit';
import { certifyElectionResults } from '../modules/analytics/analytics.service';
import type { Election } from '@prisma/client';

const SYSTEM_ACTOR_NAME = 'Automated Election Schedule';

/**
 * Returns the election that voter/candidate/position management currently operates on, defaulting
 * to the most recently created non-archived election. Full election creation/switching UI lands
 * in the Election Management module; until then this bootstraps a single default election so the
 * rest of the system (which is already fully multi-election-scoped in the schema) has one to use.
 */
export async function getCurrentElection(): Promise<Election> {
  const existing = await prisma.election.findFirst({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { createdAt: 'desc' },
  });

  const election =
    existing ??
    (await prisma.election.create({
      data: {
        title: process.env.DEFAULT_ELECTION_TITLE ?? 'General Election',
        year: new Date().getFullYear(),
        status: 'DRAFT',
      },
    }));

  return applyScheduledTransition(election);
}

/**
 * Auto-open/auto-close based on the election's own startTime/endTime — deliberately runs
 * opportunistically on every getCurrentElection() call (i.e. on virtually every admin request and
 * every dashboard poll) rather than a dedicated timer or external cron. During an active election
 * there's near-constant traffic (admins watching turnout, voters casting ballots), so in practice
 * this fires within moments of the scheduled time. The one soft edge case: if truly nothing hits
 * the app in the window straddling the scheduled moment, the transition happens on the next request
 * after it instead of exactly on time — acceptable given the alternative is new scheduling infra.
 *
 * Both transitions use a compare-and-swap update (mirrors castVote's token-claim pattern) so
 * concurrent requests can never double-transition or double-certify.
 */
async function applyScheduledTransition(election: Election): Promise<Election> {
  const now = new Date();

  if (election.status === 'DRAFT' && !election.isLocked && election.startTime && election.startTime <= now) {
    const [positionCount, candidateCount] = await Promise.all([
      prisma.position.count({ where: { electionId: election.id } }),
      prisma.candidate.count({ where: { electionId: election.id } }),
    ]);
    // Not ready yet (no positions/candidates) — leave it in DRAFT and try again on the next request
    // rather than erroring; there's no admin request in flight here to show an error to.
    if (positionCount === 0 || candidateCount === 0) return election;

    const claimed = await prisma.election.updateMany({
      where: { id: election.id, status: 'DRAFT' },
      data: { status: 'ACTIVE' },
    });
    if (claimed.count === 1) {
      await writeAuditLog({
        action: 'ELECTION_OPENED',
        actorName: SYSTEM_ACTOR_NAME,
        targetType: 'ELECTION',
        targetId: election.id,
        electionId: election.id,
        metadata: { trigger: 'scheduled', startTime: election.startTime },
      });
      return { ...election, status: 'ACTIVE' };
    }
    return election;
  }

  if (election.status === 'ACTIVE' && !election.isLocked && election.endTime && election.endTime <= now) {
    const lockedAt = now;
    const claimed = await prisma.election.updateMany({
      where: { id: election.id, status: 'ACTIVE' },
      data: { status: 'CLOSED', isLocked: true, lockedAt },
    });
    if (claimed.count === 1) {
      await prisma.$transaction(
        async (tx) => {
          await certifyElectionResults(tx, election.id, null);
        },
        // Default 5s interactive-transaction timeout is too tight for certifyElectionResults' read
        // fan-out (positions/candidates/activity/audit log) over the network to Supabase's pooler.
        { timeout: 15000 }
      );
      await writeAuditLog({
        action: 'ELECTION_CLOSED',
        actorName: SYSTEM_ACTOR_NAME,
        targetType: 'ELECTION',
        targetId: election.id,
        electionId: election.id,
        metadata: { trigger: 'scheduled', endTime: election.endTime },
      });
      await writeAuditLog({
        action: 'ELECTION_LOCKED',
        actorName: SYSTEM_ACTOR_NAME,
        targetType: 'ELECTION',
        targetId: election.id,
        electionId: election.id,
        metadata: { reason: 'election_closed_scheduled' },
      });
      await writeAuditLog({
        action: 'ELECTION_RESULTS_CERTIFIED',
        actorName: SYSTEM_ACTOR_NAME,
        targetType: 'ELECTION',
        targetId: election.id,
        electionId: election.id,
      });
      return { ...election, status: 'CLOSED', isLocked: true, lockedAt };
    }
  }

  return election;
}
