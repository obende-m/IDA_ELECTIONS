import { apiRequest } from '../../lib/apiClient';
import type { Election, ElectionFormValues } from './types';

export const electionsApi = {
  getCurrent: () => apiRequest<{ election: Election }>('/elections/current'),
  update: (data: Partial<ElectionFormValues>) =>
    apiRequest<{ election: Election }>('/elections/current', { method: 'PATCH', body: data }),
  open: () => apiRequest<{ election: Election }>('/elections/current/open', { method: 'POST' }),
  pause: () => apiRequest<{ election: Election }>('/elections/current/pause', { method: 'POST' }),
  resume: () => apiRequest<{ election: Election }>('/elections/current/resume', { method: 'POST' }),
  close: () => apiRequest<{ election: Election }>('/elections/current/close', { method: 'POST' }),
  archive: () => apiRequest<{ election: Election }>('/elections/current/archive', { method: 'POST' }),
  lock: (reason: string) => apiRequest<{ election: Election }>('/elections/current/lock', { method: 'POST', body: { reason } }),
  unlock: (reason: string) =>
    apiRequest<{ election: Election }>('/elections/current/unlock', { method: 'POST', body: { reason } }),
};
