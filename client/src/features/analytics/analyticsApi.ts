import { apiRequest } from '../../lib/apiClient';
import type { ElectionAnalytics } from './types';

export const analyticsApi = {
  get: () => apiRequest<ElectionAnalytics>('/results'),
};
