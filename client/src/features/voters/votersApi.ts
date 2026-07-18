import { apiRequest, apiUpload, apiDownload } from '../../lib/apiClient';
import type { ImportReport, Voter, VoterFormValues, VoterListQuery, VoterListResult } from './types';

function buildQueryString(query: VoterListQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.votingStatus) params.set('votingStatus', query.votingStatus);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const votersApi = {
  list: (query: VoterListQuery) => apiRequest<VoterListResult>(`/voters${buildQueryString(query)}`),
  get: (id: string) => apiRequest<{ voter: Voter }>(`/voters/${id}`),
  create: (data: VoterFormValues) => apiRequest<{ voter: Voter }>('/voters', { method: 'POST', body: data }),
  update: (id: string, data: Partial<VoterFormValues>) =>
    apiRequest<{ voter: Voter }>(`/voters/${id}`, { method: 'PATCH', body: data }),
  activate: (id: string) => apiRequest<{ voter: Voter }>(`/voters/${id}/activate`, { method: 'POST' }),
  deactivate: (id: string) => apiRequest<{ voter: Voter }>(`/voters/${id}/deactivate`, { method: 'POST' }),
  issueToken: (id: string) => apiRequest<{ votingLink: string }>(`/voters/${id}/token/issue`, { method: 'POST' }),
  revokeToken: (id: string) => apiRequest<void>(`/voters/${id}/token/revoke`, { method: 'POST' }),
  replaceToken: (id: string) => apiRequest<{ votingLink: string }>(`/voters/${id}/token/replace`, { method: 'POST' }),
  votingLink: (id: string) => apiRequest<{ votingLink: string }>(`/voters/${id}/token/link`),
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<{ report: ImportReport }>('/voters/import', formData);
  },
  exportVoters: (query: VoterListQuery) => apiDownload(`/voters/export${buildQueryString(query)}`, 'voters.csv'),
  exportVotingLinks: () => apiDownload('/voters/export/links', 'voting-links.csv'),
};
