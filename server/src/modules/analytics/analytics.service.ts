import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redactActorName } from '../../lib/audit';

/**
 * Single source of truth for every election statistic — Dashboard, Live Results, and Reports all
 * read through this file. Nothing else should query CandidateTally, PositionTally, ElectionTally,
 * ActivityBucket, or ElectionResultSnapshot directly; those tables exist only to make the reads
 * below cheap (O(candidates/positions), never O(votes)). They're kept in sync by recordVoteInTallies,
 * called from inside voting.service.ts's castVote transaction — never written anywhere else except
 * reconcileTallies' drift-repair path.
 */

type DbClient = Prisma.TransactionClient | typeof prisma;

export const CURRENT_SCHEMA_VERSION = 1;

export interface CandidateResult {
  id: string;
  name: string;
  photoUrl: string | null;
  voteCount: number;
  pct: number;
}

export interface PositionResult {
  id: string;
  title: string;
  maxSelections: number;
  abstentions: number;
  candidates: CandidateResult[];
  winner: CandidateResult | null;
  runnerUp: CandidateResult | null;
}

export interface TimelinePoint {
  hourBucket: string;
  ballotsCast: number;
  cumulativeBallotsCast: number;
  cumulativeTurnoutPct: number;
}

export interface RecentActivityEntry {
  timestamp: string;
  action: string;
  /** Redacted to null for voter-actor entries (e.g. VOTE_CAST) — individual voter identity is
   *  restricted to the Vote Records module (ELECTION_COMMITTEE/SUPER_ADMIN only, itself audit-logged
   *  on every read); the Dashboard is visible to every admin role, so it never gets a voter's name. */
  actorName: string | null;
  targetType: string | null;
}

export interface ElectionAnalytics {
  schemaVersion: number;
  election: {
    id: string;
    title: string;
    year: number;
    status: string;
    startTime: string | null;
    endTime: string | null;
  };
  registeredVoters: number;
  ballotsCast: number;
  /** Registered voters who never cast a ballot at all (distinct from a position-level abstention). */
  abstainedVoters: number;
  turnoutPct: number;
  positions: PositionResult[];
  timeline: TimelinePoint[];
  recentActivity: RecentActivityEntry[];
  /** Present only when this payload came from a certified snapshot (closed/archived elections). */
  certifiedAt: string | null;
  certifiedById: string | null;
}

const RECENT_ACTIVITY_ACTIONS = [
  'VOTE_CAST',
  'TOKEN_ISSUED',
  'TOKEN_REPLACEMENT_ISSUED',
  'VOTER_IMPORT_COMPLETED',
  'ELECTION_OPENED',
  'ELECTION_PAUSED',
  'ELECTION_RESUMED',
  'ELECTION_CLOSED',
  'ELECTION_LOCKED',
  'ELECTION_UNLOCKED',
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function startOfHour(date: Date): Date {
  const bucket = new Date(date);
  bucket.setMinutes(0, 0, 0);
  return bucket;
}

async function computeLiveAnalytics(electionId: string, db: DbClient = prisma): Promise<ElectionAnalytics> {
  const election = await db.election.findUniqueOrThrow({ where: { id: electionId } });

  const [registeredVoters, electionTally, positions, activityBuckets, recentLogs] = await Promise.all([
    db.voter.count({ where: { electionId } }),
    db.electionTally.findUnique({ where: { electionId } }),
    db.position.findMany({
      where: { electionId },
      orderBy: { displayOrder: 'asc' },
      include: {
        tally: true,
        candidates: { orderBy: { displayOrder: 'asc' }, include: { tally: true } },
      },
    }),
    db.activityBucket.findMany({ where: { electionId }, orderBy: { hourBucket: 'asc' } }),
    db.auditLog.findMany({
      where: { electionId, action: { in: RECENT_ACTIVITY_ACTIONS } },
      orderBy: { timestamp: 'desc' },
      take: 10,
    }),
  ]);

  const ballotsCast = electionTally?.ballotsCast ?? 0;
  const turnoutPct = registeredVoters > 0 ? round2((ballotsCast / registeredVoters) * 100) : 0;
  const abstainedVoters = Math.max(registeredVoters - ballotsCast, 0);

  const positionResults: PositionResult[] = positions.map((position) => {
    const candidates: CandidateResult[] = position.candidates.map((c) => {
      const voteCount = c.tally?.voteCount ?? 0;
      return {
        id: c.id,
        name: c.name,
        photoUrl: c.photoUrl,
        voteCount,
        pct: ballotsCast > 0 ? round2((voteCount / ballotsCast) * 100) : 0,
      };
    });
    const ranked = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
    return {
      id: position.id,
      title: position.title,
      maxSelections: position.maxSelections,
      abstentions: position.tally?.abstentions ?? 0,
      candidates,
      winner: ranked[0] ?? null,
      runnerUp: ranked[1] ?? null,
    };
  });

  let cumulative = 0;
  const timeline: TimelinePoint[] = activityBuckets.map((bucket) => {
    cumulative += bucket.ballotsCast;
    return {
      hourBucket: bucket.hourBucket.toISOString(),
      ballotsCast: bucket.ballotsCast,
      cumulativeBallotsCast: cumulative,
      cumulativeTurnoutPct: registeredVoters > 0 ? round2((cumulative / registeredVoters) * 100) : 0,
    };
  });

  const recentActivity: RecentActivityEntry[] = recentLogs.map((log) => ({
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    actorName: redactActorName(log.actorName, log.actorRole),
    targetType: log.targetType,
  }));

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    election: {
      id: election.id,
      title: election.title,
      year: election.year,
      status: election.status,
      startTime: election.startTime?.toISOString() ?? null,
      endTime: election.endTime?.toISOString() ?? null,
    },
    registeredVoters,
    ballotsCast,
    abstainedVoters,
    turnoutPct,
    positions: positionResults,
    timeline,
    recentActivity,
    certifiedAt: null,
    certifiedById: null,
  };
}

async function writeSnapshot(db: DbClient, electionId: string, certifiedById: string | null): Promise<ElectionAnalytics> {
  const analytics = await computeLiveAnalytics(electionId, db);
  await db.electionResultSnapshot.upsert({
    where: { electionId },
    create: {
      electionId,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      data: analytics as unknown as Prisma.InputJsonValue,
      certifiedById,
    },
    update: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      data: analytics as unknown as Prisma.InputJsonValue,
    },
  });
  return analytics;
}

/** Called from inside closeElection's transaction — computes and freezes the final analytics payload. */
export async function certifyElectionResults(tx: Prisma.TransactionClient, electionId: string, certifiedById: string): Promise<void> {
  await writeSnapshot(tx, electionId, certifiedById);
}

/**
 * Recomputes CandidateTally/ElectionTally/ActivityBucket from raw Vote rows and overwrites them —
 * a drift-repair safety net (see server/prisma migrations for the equivalent one-time backfill).
 * PositionTally abstentions can only be reconciled for maxSelections = 1 positions; a multi-select
 * position's true abstention count isn't derivable from Vote rows alone (see schema.prisma comment).
 */
export async function reconcileTallies(electionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const candidates = await tx.candidate.findMany({ where: { electionId }, select: { id: true } });
    const voteCounts = await tx.vote.groupBy({ by: ['candidateId'], where: { electionId }, _count: { _all: true } });
    const candidateCountMap = new Map(voteCounts.map((v) => [v.candidateId, v._count._all]));
    for (const candidate of candidates) {
      await tx.candidateTally.update({
        where: { candidateId: candidate.id },
        data: { voteCount: candidateCountMap.get(candidate.id) ?? 0 },
      });
    }

    const ballotGroups = await tx.vote.groupBy({ by: ['referenceNumber'], where: { electionId }, _min: { castAt: true } });
    const ballotsCast = ballotGroups.length;
    const lastVoteAt = ballotGroups.reduce<Date | null>((max, g) => {
      const at = g._min.castAt;
      return at && (!max || at > max) ? at : max;
    }, null);

    await tx.electionTally.upsert({
      where: { electionId },
      create: { electionId, ballotsCast, lastVoteAt },
      update: { ballotsCast, lastVoteAt },
    });

    const positions = await tx.position.findMany({ where: { electionId }, select: { id: true, maxSelections: true } });
    for (const position of positions) {
      if (position.maxSelections !== 1) continue;
      const positionVotes = await tx.vote.count({ where: { electionId, positionId: position.id } });
      await tx.positionTally.update({
        where: { positionId: position.id },
        data: { abstentions: Math.max(ballotsCast - positionVotes, 0) },
      });
    }

    const bucketCounts = new Map<string, number>();
    for (const g of ballotGroups) {
      const at = g._min.castAt;
      if (!at) continue;
      const key = startOfHour(at).toISOString();
      bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
    }
    await tx.activityBucket.deleteMany({ where: { electionId } });
    if (bucketCounts.size > 0) {
      await tx.activityBucket.createMany({
        data: Array.from(bucketCounts.entries()).map(([iso, count]) => ({
          electionId,
          hourBucket: new Date(iso),
          ballotsCast: count,
        })),
      });
    }
  });
}

/**
 * Called from inside castVote's existing transaction. Uses one set-based raw UPDATE per table
 * (not a per-candidate/per-position loop in app code) — looping individual updates in iteration
 * order risks a lock-ordering deadlock the moment two concurrent ballots touch an overlapping set
 * of rows in a different order (any position with maxSelections > 1 makes this possible). A single
 * statement lets Postgres acquire the row locks in its own consistent order instead.
 */
export async function recordVoteInTallies(
  tx: Prisma.TransactionClient,
  electionId: string,
  params: { candidateIds: string[]; abstainedPositionIds: string[]; castAt: Date }
): Promise<void> {
  const { candidateIds, abstainedPositionIds, castAt } = params;

  if (candidateIds.length > 0) {
    await tx.$executeRaw`UPDATE candidate_tallies SET "voteCount" = "voteCount" + 1, "updatedAt" = NOW() WHERE "candidateId" IN (${Prisma.join(candidateIds)})`;
  }
  if (abstainedPositionIds.length > 0) {
    await tx.$executeRaw`UPDATE position_tallies SET "abstentions" = "abstentions" + 1 WHERE "positionId" IN (${Prisma.join(abstainedPositionIds)})`;
  }

  await tx.electionTally.upsert({
    where: { electionId },
    create: { electionId, ballotsCast: 1, lastVoteAt: castAt },
    update: { ballotsCast: { increment: 1 }, lastVoteAt: castAt },
  });

  const hourBucket = startOfHour(castAt);
  await tx.activityBucket.upsert({
    where: { electionId_hourBucket: { electionId, hourBucket } },
    create: { electionId, hourBucket, ballotsCast: 1 },
    update: { ballotsCast: { increment: 1 } },
  });
}

/**
 * The one read path every consumer (Dashboard, Results, Reports) goes through. Active/draft/paused
 * elections always compute live from the tally tables. Closed/archived elections read the frozen
 * certified snapshot when one exists at the current schema version; otherwise (an election closed
 * before this feature existed, or a schema version bump) they compute live once and lazily (re)certify
 * — safe because votes are immutably locked at that point, so the numbers can't have changed.
 */
export async function getElectionAnalytics(electionId: string): Promise<ElectionAnalytics> {
  const election = await prisma.election.findUniqueOrThrow({ where: { id: electionId } });

  if (election.status !== 'CLOSED' && election.status !== 'ARCHIVED') {
    return computeLiveAnalytics(electionId);
  }

  const snapshot = await prisma.electionResultSnapshot.findUnique({ where: { electionId } });
  if (snapshot && snapshot.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return { ...(snapshot.data as unknown as ElectionAnalytics), certifiedAt: snapshot.certifiedAt.toISOString(), certifiedById: snapshot.certifiedById };
  }

  const analytics = await writeSnapshot(prisma, electionId, snapshot?.certifiedById ?? null);
  const refreshed = await prisma.electionResultSnapshot.findUniqueOrThrow({ where: { electionId } });
  return { ...analytics, certifiedAt: refreshed.certifiedAt.toISOString(), certifiedById: refreshed.certifiedById };
}
