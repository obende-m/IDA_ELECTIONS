import { useQuery } from '@tanstack/react-query';
import { auditApi } from './auditApi';
import type { AuditLogQuery } from './types';

export function useAuditLog(query: AuditLogQuery) {
  return useQuery({
    queryKey: ['audit-log', query],
    queryFn: () => auditApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useAuditActions() {
  return useQuery({ queryKey: ['audit-actions'], queryFn: auditApi.actions });
}
