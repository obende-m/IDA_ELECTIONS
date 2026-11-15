import { apiRequest } from '../../lib/apiClient';
import type { ReceiptCheck, VoteRecordsQuery, VoteRecordsResult } from './types';

function buildQueryString(query: VoteRecordsQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const voteRecordsApi = {
  list: (query: VoteRecordsQuery) => apiRequest<VoteRecordsResult>(`/voting/records${buildQueryString(query)}`),
  /** Every check is audit-logged on the server, found or not. */
  checkReceipt: (reference: string) => apiRequest<ReceiptCheck>(`/voting/receipts/${encodeURIComponent(reference.trim())}`),
};
