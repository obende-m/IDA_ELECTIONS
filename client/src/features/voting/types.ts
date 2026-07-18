export type VotingTokenStatus = 'ISSUED' | 'CONSUMED' | 'REVOKED';

export interface ResolvedVotingSession {
  token: string;
  voterId: string;
  fullName: string;
  membershipNumber: string;
  status: VotingTokenStatus;
}
