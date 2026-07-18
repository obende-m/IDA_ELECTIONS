import { apiRequest } from '../../lib/apiClient';
import type { Candidate, CandidateFormValues } from './types';

export const candidatesApi = {
  list: (positionId?: string) =>
    apiRequest<{ candidates: Candidate[] }>(`/candidates${positionId ? `?positionId=${positionId}` : ''}`),
  create: (data: CandidateFormValues) => apiRequest<{ candidate: Candidate }>('/candidates', { method: 'POST', body: data }),
  update: (id: string, data: Partial<CandidateFormValues>) =>
    apiRequest<{ candidate: Candidate }>(`/candidates/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiRequest<void>(`/candidates/${id}`, { method: 'DELETE' }),
};
