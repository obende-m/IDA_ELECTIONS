export type VotingTokenStatus = 'ISSUED' | 'CONSUMED' | 'REVOKED';

export interface ResolvedVotingSession {
  token: string;
  voterId: string;
  fullName: string;
  membershipNumber: string;
  status: VotingTokenStatus;
}

export interface BallotCandidate {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
}

export interface BallotPosition {
  id: string;
  title: string;
  description: string | null;
  maxSelections: number;
  displayOrder: number;
  candidates: BallotCandidate[];
}

export interface Ballot {
  election: { id: string; title: string; year: number };
  positions: BallotPosition[];
}

/** positionId -> selected candidateIds (empty array means the voter abstained on that position) */
export type BallotSelections = Record<string, string[]>;

export interface CastVoteResult {
  referenceNumber: string;
}
