import { apiRequest } from '../../lib/apiClient';
import type { Position, PositionFormValues } from './types';

export const positionsApi = {
  list: () => apiRequest<{ positions: Position[] }>('/positions'),
  create: (data: PositionFormValues) => apiRequest<{ position: Position }>('/positions', { method: 'POST', body: data }),
  update: (id: string, data: Partial<PositionFormValues>) =>
    apiRequest<{ position: Position }>(`/positions/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiRequest<void>(`/positions/${id}`, { method: 'DELETE' }),
};
