import type { Request } from 'express';
import { prisma } from './prisma';
import type { Role, Prisma } from '@prisma/client';

export interface AuditLogEntry {
  action: string;
  actorId?: string;
  actorRole?: Role;
  actorName?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  electionId?: string;
  req?: Request;
}

/** Writes a single AuditLog row. Every security-relevant action in the system should call this. */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const ipAddress = entry.req?.ip;
  const userAgent = entry.req?.get('user-agent');
  // Every admin-tier role (not VOTER, which has no User row) links back to the User table.
  const isAdminTier = entry.actorRole !== undefined && entry.actorRole !== 'VOTER';

  await prisma.auditLog.create({
    data: {
      action: entry.action,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      actorName: entry.actorName,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
      electionId: entry.electionId,
      ipAddress,
      userAgent,
      userId: isAdminTier ? entry.actorId : undefined,
    },
  });
}

/**
 * Individual voter identity must never surface outside the Vote Records module (see
 * voting.service.ts) — every other consumer of AuditLog rows (analytics.service.ts's
 * recentActivity, report.service.ts's audit report, audit.service.ts's viewer) must redact the
 * actor's name whenever the action was performed by a voter rather than an admin.
 */
export function redactActorName(actorName: string | null, actorRole: Role | null): string | null {
  return actorRole === 'VOTER' ? null : actorName;
}
