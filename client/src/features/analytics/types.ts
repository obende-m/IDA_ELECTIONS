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
  /** True when two or more candidates are level at the winning position; `winner` should not be shown as a single winner. */
  tied?: boolean;
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
  abstainedVoters: number;
  turnoutPct: number;
  positions: PositionResult[];
  timeline: TimelinePoint[];
  recentActivity: RecentActivityEntry[];
  certifiedAt: string | null;
  certifiedById: string | null;
}

/** What to display as a position's leader. Never names a winner when nobody has votes or the position is tied. */
export type PositionOutcome =
  | { kind: 'none' }
  | { kind: 'tie' }
  | { kind: 'leader'; name: string };

/** Uses the backend flag when present; for single-selection positions falls back to checking the top two counts. */
function isTied(position: PositionResult): boolean {
  if (position.tied !== undefined) return position.tied;
  if (position.maxSelections !== 1) return false;
  const counts = position.candidates.map((c) => c.voteCount).sort((a, b) => b - a);
  return counts.length > 1 && counts[0] > 0 && counts[0] === counts[1];
}

export function getPositionOutcome(position: PositionResult): PositionOutcome {
  const totalVotes = position.candidates.reduce((sum, c) => sum + c.voteCount, 0);
  if (totalVotes === 0) return { kind: 'none' };
  if (isTied(position)) return { kind: 'tie' };
  if (position.winner && position.winner.voteCount > 0) return { kind: 'leader', name: position.winner.name };
  return { kind: 'none' };
}
