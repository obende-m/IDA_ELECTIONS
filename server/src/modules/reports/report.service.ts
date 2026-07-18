import { prisma } from '../../lib/prisma';
import { redactActorName } from '../../lib/audit';
import { getElectionAnalytics, type ElectionAnalytics } from '../analytics/analytics.service';

/**
 * Every report type here is a thin presentation wrapper around analytics.service.ts's
 * getElectionAnalytics — no report may run its own query against Vote/CandidateTally/etc.
 * The one exception is buildAuditReport, which needs the full audit trail (not the Dashboard's
 * curated latest-10) and so queries AuditLog directly — see its redaction note below.
 */

function formatDuration(startTime: string | null, endTime: string | null): string {
  if (!startTime) return 'Not yet started';
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '0m';
}

export interface ElectionSummaryReport {
  analytics: ElectionAnalytics;
  durationLabel: string;
  certificationLabel: string | null;
}

export async function buildElectionSummary(electionId: string): Promise<ElectionSummaryReport> {
  const analytics = await getElectionAnalytics(electionId);
  return {
    analytics,
    durationLabel: formatDuration(analytics.election.startTime, analytics.election.endTime),
    certificationLabel: analytics.certifiedAt ? `Certified ${new Date(analytics.certifiedAt).toLocaleString()}` : null,
  };
}

export interface PositionResultsReport {
  election: ElectionAnalytics['election'];
  positions: ElectionAnalytics['positions'];
}

export async function buildPositionResults(electionId: string): Promise<PositionResultsReport> {
  const analytics = await getElectionAnalytics(electionId);
  return { election: analytics.election, positions: analytics.positions };
}

export interface ParticipationReport {
  election: ElectionAnalytics['election'];
  registeredVoters: number;
  ballotsCast: number;
  abstainedVoters: number;
  turnoutPct: number;
  timeline: ElectionAnalytics['timeline'];
}

export async function buildParticipationReport(electionId: string): Promise<ParticipationReport> {
  const analytics = await getElectionAnalytics(electionId);
  return {
    election: analytics.election,
    registeredVoters: analytics.registeredVoters,
    ballotsCast: analytics.ballotsCast,
    abstainedVoters: analytics.abstainedVoters,
    turnoutPct: analytics.turnoutPct,
    timeline: analytics.timeline,
  };
}

export interface AuditReportEntry {
  timestamp: string;
  action: string;
  /** Redacted to null for voter-actor entries — same rule as analytics.service.ts's recentActivity;
   *  individual voter identity must never appear in an exported report. */
  actorName: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
}

export interface AuditReport {
  electionId: string;
  from: string | null;
  to: string | null;
  entries: AuditReportEntry[];
}

export async function buildAuditReport(electionId: string, range: { from?: Date; to?: Date } = {}): Promise<AuditReport> {
  const logs = await prisma.auditLog.findMany({
    where: {
      electionId,
      ...(range.from || range.to
        ? { timestamp: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
        : {}),
    },
    orderBy: { timestamp: 'asc' },
  });

  return {
    electionId,
    from: range.from?.toISOString() ?? null,
    to: range.to?.toISOString() ?? null,
    entries: logs.map((log) => ({
      timestamp: log.timestamp.toISOString(),
      action: log.action,
      actorName: redactActorName(log.actorName, log.actorRole),
      actorRole: log.actorRole,
      targetType: log.targetType,
      targetId: log.targetId,
    })),
  };
}
