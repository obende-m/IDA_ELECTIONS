export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actorName: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
}

export interface AuditLogResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogQuery {
  search?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
