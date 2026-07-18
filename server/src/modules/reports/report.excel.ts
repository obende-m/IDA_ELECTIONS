import ExcelJS from 'exceljs';
import type { ElectionSummaryReport, PositionResultsReport, ParticipationReport, AuditReport } from './report.service';

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1B1B' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
  });
}

function addStatsSheet(workbook: ExcelJS.Workbook, name: string, stats: [string, string | number][]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [{ header: 'Metric', key: 'metric', width: 30 }, { header: 'Value', key: 'value', width: 30 }];
  styleHeaderRow(sheet.getRow(1));
  for (const [metric, value] of stats) sheet.addRow({ metric, value });
}

function addPositionSheet(workbook: ExcelJS.Workbook, position: PositionResultsReport['positions'][number]) {
  const sheet = workbook.addWorksheet(position.title.slice(0, 31));
  sheet.columns = [
    { header: 'Candidate', key: 'name', width: 32 },
    { header: 'Votes', key: 'voteCount', width: 12 },
    { header: 'Percentage', key: 'pct', width: 14 },
    { header: 'Result', key: 'result', width: 16 },
  ];
  styleHeaderRow(sheet.getRow(1));
  for (const candidate of position.candidates) {
    sheet.addRow({
      name: candidate.name,
      voteCount: candidate.voteCount,
      pct: `${candidate.pct}%`,
      result: candidate.id === position.winner?.id && candidate.voteCount > 0 ? 'Winner' : candidate.id === position.runnerUp?.id && candidate.voteCount > 0 ? 'Runner-up' : '',
    });
  }
  sheet.addRow({});
  sheet.addRow({ name: 'Abstentions', voteCount: position.abstentions });
}

export async function renderElectionSummaryExcel(report: ElectionSummaryReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  addStatsSheet(workbook, 'Summary', [
    ['Election', report.analytics.election.title],
    ['Status', report.analytics.election.status],
    ['Duration', report.durationLabel],
    ['Registered Voters', report.analytics.registeredVoters],
    ['Ballots Cast', report.analytics.ballotsCast],
    ['Abstained Voters', report.analytics.abstainedVoters],
    ['Turnout %', report.analytics.turnoutPct],
    ['Certification', report.certificationLabel ?? 'Not yet certified'],
  ]);
  for (const position of report.analytics.positions) addPositionSheet(workbook, position);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function renderPositionResultsExcel(report: PositionResultsReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const position of report.positions) addPositionSheet(workbook, position);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function renderParticipationExcel(report: ParticipationReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  addStatsSheet(workbook, 'Participation', [
    ['Election', report.election.title],
    ['Registered Voters', report.registeredVoters],
    ['Ballots Cast', report.ballotsCast],
    ['Abstained Voters', report.abstainedVoters],
    ['Turnout %', report.turnoutPct],
  ]);
  const sheet = workbook.addWorksheet('Hourly Timeline');
  sheet.columns = [
    { header: 'Hour', key: 'hour', width: 24 },
    { header: 'Ballots Cast', key: 'ballotsCast', width: 16 },
    { header: 'Cumulative', key: 'cumulative', width: 16 },
    { header: 'Cumulative Turnout %', key: 'turnout', width: 20 },
  ];
  styleHeaderRow(sheet.getRow(1));
  for (const point of report.timeline) {
    sheet.addRow({
      hour: new Date(point.hourBucket).toLocaleString(),
      ballotsCast: point.ballotsCast,
      cumulative: point.cumulativeBallotsCast,
      turnout: point.cumulativeTurnoutPct,
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function renderAuditExcel(report: AuditReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Audit Trail');
  sheet.columns = [
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Action', key: 'action', width: 28 },
    { header: 'Actor', key: 'actorName', width: 24 },
    { header: 'Actor Role', key: 'actorRole', width: 16 },
    { header: 'Target Type', key: 'targetType', width: 16 },
  ];
  styleHeaderRow(sheet.getRow(1));
  for (const entry of report.entries) {
    sheet.addRow({
      timestamp: new Date(entry.timestamp).toLocaleString(),
      action: entry.action,
      actorName: entry.actorName ?? (entry.actorRole === 'VOTER' ? 'Voter (identity protected)' : '—'),
      actorRole: entry.actorRole ?? '—',
      targetType: entry.targetType ?? '—',
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
