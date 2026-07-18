import { apiRequest } from '../../lib/apiClient';
import type { AuditLogQuery, AuditLogResult } from './types';

function buildQueryString(query: AuditLogQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.action) params.set('action', query.action);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const auditApi = {
  list: (query: AuditLogQuery) => apiRequest<AuditLogResult>(`/audit${buildQueryString(query)}`),
  actions: () => apiRequest<{ actions: string[] }>('/audit/actions'),
};
