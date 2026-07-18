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
