import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redactActorName } from '../../lib/audit';
import type { AuditLogQuery } from './audit.validation';

export interface AuditLogEntryView {
  id: string;
  timestamp: string;
  action: string;
  actorName: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
}

/**
 * Searchable/filterable audit trail viewer. Individual voter identity must never surface here —
 * redactActorName (lib/audit.ts) blanks the displayed name for voter-actor rows, and the `search`
 * filter deliberately never matches against a voter's actorName at the query level either (only
 * against action/targetType, or an admin-tier actorName): matching-but-redacted would still leak
 * "this name exists in the log" as an oracle for whether a specific person voted.
 */
export async function listAuditLog(electionId: string, query: AuditLogQuery) {
  const where: Prisma.AuditLogWhereInput = {
    electionId,
    ...(query.action ? { action: query.action } : {}),
    ...(query.from || query.to
      ? { timestamp: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { action: { contains: query.search, mode: 'insensitive' as const } },
            { targetType: { contains: query.search, mode: 'insensitive' as const } },
            { AND: [{ actorRole: { not: 'VOTER' } }, { actorName: { contains: query.search, mode: 'insensitive' as const } }] },
          ],
        }
      : {}),
  };

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  const entries: AuditLogEntryView[] = logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    actorName: redactActorName(log.actorName, log.actorRole),
    actorRole: log.actorRole,
    targetType: log.targetType,
    targetId: log.targetId,
    ipAddress: log.ipAddress,
  }));

  return { entries, total, page: query.page, pageSize: query.pageSize };
}

/** Distinct action types recorded for this election so far — backs the filter dropdown. */
export async function listDistinctActions(electionId: string): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: { electionId },
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  });
  return rows.map((r) => r.action);
}
