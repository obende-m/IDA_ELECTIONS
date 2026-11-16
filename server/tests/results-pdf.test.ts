/** The results PDF: who it declares elected (ties included) and that it renders with the bundled fonts. No database needed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { drawResults, positionOutcome, type ResultsDocumentData } from '../src/modules/reports/results.pdf';

const cand = (id: string, voteCount: number, name = `Candidate ${id}`) => ({ id, name, photoUrl: null, voteCount, pct: voteCount });
const pos = (maxSelections: number, ...candidates: ReturnType<typeof cand>[]) => ({ id: 'p', title: 'Chair', maxSelections, abstentions: 0, candidates, winner: null, runnerUp: null });

test('one seat: the top candidate is elected', () => {
  const o = positionOutcome(pos(1, cand('a', 10), cand('b', 30), cand('c', 5)));
  assert.deepEqual(o.elected.map((c) => c.id), ['b']);
  assert.equal(o.tiedAtCutoff.length, 0);
});

test('one seat tied at the top: nobody is declared elected', () => {
  const o = positionOutcome(pos(1, cand('a', 20), cand('b', 20), cand('c', 3)));
  assert.equal(o.elected.length, 0);
  assert.deepEqual(o.tiedAtCutoff.map((c) => c.id).sort(), ['a', 'b']);
});

test('three seats with a tie for the last one: only the two clear winners are elected', () => {
  const o = positionOutcome(pos(3, cand('a', 50), cand('b', 40), cand('c', 30), cand('d', 30), cand('e', 10)));
  assert.deepEqual(o.elected.map((c) => c.id), ['a', 'b']);
  assert.deepEqual(o.tiedAtCutoff.map((c) => c.id).sort(), ['c', 'd']);
});

test('no votes: nobody elected, and candidates on zero are never "elected"', () => {
  const o = positionOutcome(pos(2, cand('a', 0), cand('b', 0)));
  assert.equal(o.noVotes, true);
  assert.equal(o.elected.length, 0);
  assert.equal(o.tiedAtCutoff.length, 0, 'a 0–0 tie is not a tie to resolve');
});

test('the full document renders with the bundled fonts (accented names included)', async () => {
  for (const f of ['Fraunces-SemiBold.ttf', 'Inter-Regular.ttf', 'IBMPlexMono-Medium.woff']) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'fonts', f)), `${f} is shipped with the server`);
  }
  const data: ResultsDocumentData = {
    election: { id: 'e', title: 'Test Election', year: 2026, status: 'CLOSED', startTime: '2026-11-20T08:00:00Z', endTime: '2026-11-20T16:00:00Z' },
    registeredVoters: 10,
    ballotsCast: 8,
    abstainedVoters: 2,
    turnoutPct: 80,
    certifiedAt: '2026-11-20T16:00:05Z',
    positions: [pos(1, cand('a', 5, 'Adébáyọ̀ Ọlásùnkànmí'), cand('b', 3, 'Ṣeun Adéyẹmí')), pos(1, cand('c', 4), cand('d', 4)), pos(3, cand('e', 6), cand('f', 5), cand('g', 2), cand('h', 0))],
  };
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on('end', () => resolve()));
  drawResults(doc, data, new Map(), 'Official Election Results');
  doc.end();
  await done;
  const pdf = Buffer.concat(chunks);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 10_000);
  assert.match(pdf.toString('latin1'), /Fraunces72pt-SemiBold/, 'the display font is embedded, not a fallback');
});
