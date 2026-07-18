import { apiRequest } from '../../lib/apiClient';
import type { Election } from './types';

export const electionsApi = {
  getCurrent: () => apiRequest<{ election: Election }>('/elections/current'),
  close: () => apiRequest<{ election: Election }>('/elections/current/close', { method: 'POST' }),
  lock: (reason: string) => apiRequest<{ election: Election }>('/elections/current/lock', { method: 'POST', body: { reason } }),
  unlock: (reason: string) =>
    apiRequest<{ election: Election }>('/elections/current/unlock', { method: 'POST', body: { reason } }),
};
