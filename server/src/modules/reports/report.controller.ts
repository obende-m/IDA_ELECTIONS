import type { Request, Response } from 'express';
import { getCurrentElection } from '../../lib/election';
import { actorFromRequest } from '../../lib/actor';
import { writeAuditLog } from '../../lib/audit';
import { AppError } from '../../middleware/errorHandler';
import { toCsv } from '../../lib/csv';
import * as reportService from './report.service';
import * as reportPdf from './report.pdf';
import * as reportExcel from './report.excel';

type ReportType = 'summary' | 'positions' | 'participation' | 'audit';
type ReportFormat = 'pdf' | 'xlsx' | 'csv';

const EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sendExcel(res: Response, filename: string, buffer: Buffer) {
  res.setHeader('Content-Type', EXCEL_CONTENT_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

function positionResultsCsv(positions: reportService.PositionResultsReport['positions']): string {
  const rows = positions.flatMap((position) =>
    position.candidates.map((candidate) => ({
      position: position.title,
      candidate: candidate.name,
      votes: candidate.voteCount,
      pct: `${candidate.pct}%`,
      result: candidate.id === position.winner?.id && candidate.voteCount > 0 ? 'Winner' : candidate.id === position.runnerUp?.id && candidate.voteCount > 0 ? 'Runner-up' : '',
    }))
  );
  return toCsv(rows, [
    { key: 'position', header: 'Position' },
    { key: 'candidate', header: 'Candidate' },
    { key: 'votes', header: 'Votes' },
    { key: 'pct', header: 'Percentage' },
    { key: 'result', header: 'Result' },
  ]);
}

export async function download(req: Request, res: Response) {
  const type = req.params.type as ReportType;
  const format = req.params.format as ReportFormat;
  if (!['summary', 'positions', 'participation', 'audit'].includes(type)) {
    throw new AppError('Unknown report type.', 404);
  }
  if (!['pdf', 'xlsx', 'csv'].includes(format)) {
    throw new AppError('Unknown report format.', 404);
  }

  const election = await getCurrentElection();
  const actor = actorFromRequest(req);

  await writeAuditLog({
    action: 'REPORT_EXPORTED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    metadata: { type, format },
    req,
  });

  switch (type) {
    case 'summary': {
      const report = await reportService.buildElectionSummary(election.id);
      if (format === 'pdf') return reportPdf.renderElectionSummaryPdf(report, res);
      if (format === 'xlsx') return sendExcel(res, 'election-summary.xlsx', await reportExcel.renderElectionSummaryExcel(report));
      const stats = toCsv(
        [
          { metric: 'Election', value: report.analytics.election.title },
          { metric: 'Status', value: report.analytics.election.status },
          { metric: 'Duration', value: report.durationLabel },
          { metric: 'Registered Voters', value: report.analytics.registeredVoters },
          { metric: 'Ballots Cast', value: report.analytics.ballotsCast },
          { metric: 'Abstained Voters', value: report.analytics.abstainedVoters },
          { metric: 'Turnout %', value: report.analytics.turnoutPct },
        ],
        [
          { key: 'metric', header: 'Metric' },
          { key: 'value', header: 'Value' },
        ]
      );
      return sendCsv(res, 'election-summary.csv', `${stats}\r\n\r\n${positionResultsCsv(report.analytics.positions)}`);
    }
    case 'positions': {
      const report = await reportService.buildPositionResults(election.id);
      if (format === 'pdf') return reportPdf.renderPositionResultsPdf(report, res);
      if (format === 'xlsx') return sendExcel(res, 'position-results.xlsx', await reportExcel.renderPositionResultsExcel(report));
      return sendCsv(res, 'position-results.csv', positionResultsCsv(report.positions));
    }
    case 'participation': {
      const report = await reportService.buildParticipationReport(election.id);
      if (format === 'pdf') return reportPdf.renderParticipationPdf(report, res);
      if (format === 'xlsx') return sendExcel(res, 'participation-report.xlsx', await reportExcel.renderParticipationExcel(report));
      const stats = toCsv(
        [
          { metric: 'Registered Voters', value: report.registeredVoters },
          { metric: 'Ballots Cast', value: report.ballotsCast },
          { metric: 'Abstained Voters', value: report.abstainedVoters },
          { metric: 'Turnout %', value: report.turnoutPct },
        ],
        [
          { key: 'metric', header: 'Metric' },
          { key: 'value', header: 'Value' },
        ]
      );
      const timeline = toCsv(
        report.timeline.map((t) => ({
          hour: new Date(t.hourBucket).toLocaleString(),
          ballotsCast: t.ballotsCast,
          cumulative: t.cumulativeBallotsCast,
          turnout: t.cumulativeTurnoutPct,
        })),
        [
          { key: 'hour', header: 'Hour' },
          { key: 'ballotsCast', header: 'Ballots Cast' },
          { key: 'cumulative', header: 'Cumulative' },
          { key: 'turnout', header: 'Cumulative Turnout %' },
        ]
      );
      return sendCsv(res, 'participation-report.csv', `${stats}\r\n\r\n${timeline}`);
    }
    case 'audit': {
      const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
      const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
      const report = await reportService.buildAuditReport(election.id, { from, to });
      if (format === 'pdf') return reportPdf.renderAuditPdf(report, res);
      if (format === 'xlsx') return sendExcel(res, 'audit-report.xlsx', await reportExcel.renderAuditExcel(report));
      const csv = toCsv(
        report.entries.map((e) => ({
          timestamp: new Date(e.timestamp).toLocaleString(),
          action: e.action,
          actorName: e.actorName ?? (e.actorRole === 'VOTER' ? 'Voter (identity protected)' : '—'),
          actorRole: e.actorRole ?? '—',
          targetType: e.targetType ?? '—',
        })),
        [
          { key: 'timestamp', header: 'Timestamp' },
          { key: 'action', header: 'Action' },
          { key: 'actorName', header: 'Actor' },
          { key: 'actorRole', header: 'Actor Role' },
          { key: 'targetType', header: 'Target Type' },
        ]
      );
      return sendCsv(res, 'audit-report.csv', csv);
    }
  }
}
