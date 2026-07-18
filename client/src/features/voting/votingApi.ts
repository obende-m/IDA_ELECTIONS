import { apiRequest } from '../../lib/apiClient';
import type { ResolvedVotingSession } from './types';

export const votingApi = {
  resolveToken: (token: string) =>
    apiRequest<Omit<ResolvedVotingSession, 'token'>>(`/voters/token/${encodeURIComponent(token)}/resolve`),
};
