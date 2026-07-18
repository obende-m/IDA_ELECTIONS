import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { ElectionSummaryReport, PositionResultsReport, ParticipationReport, AuditReport } from './report.service';

/**
 * Hand-drawn PDFs via PDFKit vector primitives — no Chromium/native-canvas dependency, no
 * charting library. "Charts" are simple filled rectangles scaled to a percentage, the same flat
 * bar visual already used across the web UI (see e.g. ResultsPage.tsx's candidate bars).
 */

const INK = '#1c1b1b'; // on-background
const GOLD = '#d4af37'; // primary-container
const SECONDARY = '#5e5e5e';
const RULE = '#d0c5af'; // outline-variant

const PAGE_MARGIN = 50;

function newDocument(res: Response, filename: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function addHeader(doc: PDFKit.PDFDocument, reportTitle: string, electionTitle: string) {
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('IGARRA DEVELOPMENT ASSOCIATION', PAGE_MARGIN, PAGE_MARGIN, { characterSpacing: 1 });
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(reportTitle.toUpperCase(), PAGE_MARGIN, PAGE_MARGIN + 16);
  doc
    .fillColor(SECONDARY)
    .font('Helvetica')
    .fontSize(11)
    .text(electionTitle, PAGE_MARGIN, PAGE_MARGIN + 42);
  doc
    .fillColor(SECONDARY)
    .fontSize(9)
    .text(`Generated ${new Date().toLocaleString()}`, PAGE_MARGIN, PAGE_MARGIN + 58);

  doc
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + 78)
    .lineTo(doc.page.width - PAGE_MARGIN, PAGE_MARGIN + 78)
    .lineWidth(2)
    .strokeColor(GOLD)
    .stroke();

  doc.y = PAGE_MARGIN + 96;
}

function addFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - PAGE_MARGIN + 10;
    doc
      .fillColor(SECONDARY)
      .font('Helvetica')
      .fontSize(8)
      .text('Igarra Development Association (IDA) — Secure Electronic Voting System. Official Electoral Commission record.', PAGE_MARGIN, bottom, {
        width: doc.page.width - PAGE_MARGIN * 2 - 60,
      });
    doc.text(`Page ${i + 1} of ${range.count}`, doc.page.width - PAGE_MARGIN - 60, bottom, { width: 60, align: 'right' });
  }
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.8);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(text.toUpperCase());
  doc.moveDown(0.3);
}

function statRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc.fillColor(SECONDARY).font('Helvetica').fontSize(10).text(label, PAGE_MARGIN, y, { continued: false, width: 220 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(value, PAGE_MARGIN + 220, y);
  doc.moveDown(0.4);
}

function candidateBar(doc: PDFKit.PDFDocument, name: string, voteCount: number, pct: number, isWinner: boolean) {
  const barMaxWidth = doc.page.width - PAGE_MARGIN * 2;
  const y = doc.y;
  doc
    .fillColor(INK)
    .font(isWinner ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(10)
    .text(name, PAGE_MARGIN, y, { continued: false, width: barMaxWidth - 120 });
  doc.font('Helvetica-Bold').fontSize(10).text(`${voteCount.toLocaleString()} (${pct}%)`, doc.page.width - PAGE_MARGIN - 120, y, { width: 120, align: 'right' });
  doc.moveDown(0.25);
  const barY = doc.y;
  doc.rect(PAGE_MARGIN, barY, barMaxWidth, 8).fillColor('#eae7e7').fill();
  doc.rect(PAGE_MARGIN, barY, Math.max(2, (pct / 100) * barMaxWidth), 8).fillColor(isWinner ? GOLD : INK).fill();
  doc.y = barY + 18;
}

function ruleLine(doc: PDFKit.PDFDocument) {
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .lineWidth(0.5)
    .strokeColor(RULE)
    .stroke();
  doc.moveDown(0.5);
}

export function renderElectionSummaryPdf(report: ElectionSummaryReport, res: Response) {
  const doc = newDocument(res, 'election-summary.pdf');
  addHeader(doc, 'Election Summary', report.analytics.election.title);

  statRow(doc, 'Election Status', report.analytics.election.status);
  statRow(doc, 'Duration', report.durationLabel);
  statRow(doc, 'Registered Voters', report.analytics.registeredVoters.toLocaleString());
  statRow(doc, 'Ballots Cast', report.analytics.ballotsCast.toLocaleString());
  statRow(doc, 'Abstained Voters', report.analytics.abstainedVoters.toLocaleString());
  statRow(doc, 'Turnout', `${report.analytics.turnoutPct}%`);
  if (report.certificationLabel) statRow(doc, 'Certification', report.certificationLabel);

  for (const position of report.analytics.positions) {
    sectionTitle(doc, position.title);
    statRow(doc, 'Abstentions', position.abstentions.toLocaleString());
    doc.moveDown(0.3);
    for (const candidate of position.candidates) {
      candidateBar(doc, candidate.name, candidate.voteCount, candidate.pct, candidate.id === position.winner?.id && candidate.voteCount > 0);
    }
    if (position.winner && position.winner.voteCount > 0) {
      doc.fillColor(SECONDARY).font('Helvetica-Oblique').fontSize(9).text(`Winner: ${position.winner.name}${position.runnerUp && position.runnerUp.voteCount > 0 ? `  ·  Runner-up: ${position.runnerUp.name}` : ''}`);
    }
    ruleLine(doc);
  }

  addFooters(doc);
  doc.end();
}

export function renderPositionResultsPdf(report: PositionResultsReport, res: Response) {
  const doc = newDocument(res, 'position-results.pdf');
  addHeader(doc, 'Position Results', report.election.title);

  for (const position of report.positions) {
    sectionTitle(doc, position.title);
    statRow(doc, 'Maximum Selections', String(position.maxSelections));
    statRow(doc, 'Abstentions', position.abstentions.toLocaleString());
    doc.moveDown(0.3);
    for (const candidate of position.candidates) {
      candidateBar(doc, candidate.name, candidate.voteCount, candidate.pct, candidate.id === position.winner?.id && candidate.voteCount > 0);
    }
    ruleLine(doc);
  }

  addFooters(doc);
  doc.end();
}

export function renderParticipationPdf(report: ParticipationReport, res: Response) {
  const doc = newDocument(res, 'participation-report.pdf');
  addHeader(doc, 'Participation Report', report.election.title);

  statRow(doc, 'Registered Voters', report.registeredVoters.toLocaleString());
  statRow(doc, 'Ballots Cast', report.ballotsCast.toLocaleString());
  statRow(doc, 'Abstained Voters', report.abstainedVoters.toLocaleString());
  statRow(doc, 'Turnout', `${report.turnoutPct}%`);

  sectionTitle(doc, 'Hourly Voting Activity');
  if (report.timeline.length === 0) {
    doc.fillColor(SECONDARY).font('Helvetica-Oblique').fontSize(10).text('No voting activity recorded yet.');
  } else {
    const maxCount = Math.max(1, ...report.timeline.map((t) => t.ballotsCast));
    for (const point of report.timeline) {
      const label = new Date(point.hourBucket).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      candidateBar(doc, label, point.ballotsCast, Math.round((point.ballotsCast / maxCount) * 100), false);
    }
  }

  addFooters(doc);
  doc.end();
}

export function renderAuditPdf(report: AuditReport, res: Response) {
  const doc = newDocument(res, 'audit-report.pdf');
  addHeader(doc, 'Audit Report', `Election ${report.electionId}`);

  if (report.entries.length === 0) {
    doc.fillColor(SECONDARY).font('Helvetica-Oblique').fontSize(10).text('No audit entries in this range.');
  }
  for (const entry of report.entries) {
    const y = doc.y;
    doc.fillColor(SECONDARY).font('Helvetica').fontSize(8).text(new Date(entry.timestamp).toLocaleString(), PAGE_MARGIN, y, { width: 140 });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text(entry.action, PAGE_MARGIN + 140, y, { width: 180 });
    doc
      .fillColor(SECONDARY)
      .font('Helvetica')
      .fontSize(8)
      .text(entry.actorName ?? (entry.actorRole === 'VOTER' ? 'Voter (identity protected)' : '—'), PAGE_MARGIN + 320, y, { width: 150 });
    doc.moveDown(0.6);
  }

  addFooters(doc);
  doc.end();
}
