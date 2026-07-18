import { apiRequest } from '../../lib/apiClient';
import type { Ballot, BallotSelections, CastVoteResult, ResolvedVotingSession } from './types';

export const votingApi = {
  resolveToken: (token: string) =>
    apiRequest<Omit<ResolvedVotingSession, 'token'>>(`/voters/token/${encodeURIComponent(token)}/resolve`),
  getBallot: (token: string) => apiRequest<Ballot>(`/voting/ballot/${encodeURIComponent(token)}`),
  castVote: (token: string, selections: BallotSelections) =>
    apiRequest<CastVoteResult>(`/voting/cast/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: { selections: Object.entries(selections).map(([positionId, candidateIds]) => ({ positionId, candidateIds })) },
    }),
};
