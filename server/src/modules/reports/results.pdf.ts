import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { CandidateResult, ElectionAnalytics, PositionResult } from '../analytics/analytics.service';

/**
 * The results PDFs ("Official Election Results" and "Election Summary"): an A4 document in the
 * voting site's own look (Fraunces / Inter / IBM Plex Mono, deep teal and gold), with the winner's
 * photo on every position. Participation and audit PDFs stay in report.pdf.ts.
 *
 * Only reads what getElectionAnalytics already returns; it never counts votes itself.
 */

const ORG_NAME = 'Igarra Development Association';
const TIME_ZONE = 'Africa/Lagos';

const C = {
  ink: '#15181a',
  muted: '#5a605d',
  faint: '#8a8f8b',
  line: '#dcd6ca',
  tint: '#f1eee7',
  teal: '#0f4c45',
  tealSoft: '#e3eeeb',
  tealText: '#cfe1dd',
  gold: '#c9a23a',
  goldSoft: '#f3e6bd',
  goldInk: '#5c4708',
  warn: '#8a5a00',
  warnSoft: '#f7ebcf',
  white: '#ffffff',
};

const PAGE = { width: 595.28, height: 841.89 };
const M = 48; // side margin
const CONTENT_W = PAGE.width - M * 2;
const TOP = 56; // content top on continuation pages
const BOTTOM = PAGE.height - 64; // content must end above the footer

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets');
const LOGO_PATH = path.join(ASSETS, 'logo-mark.png');
const FONT_DIR = path.join(ASSETS, 'fonts');
const FONTS = {
  display: 'Fraunces-SemiBold.ttf',
  displayRegular: 'Fraunces-Regular.ttf',
  displayItalic: 'Fraunces-Italic.ttf',
  body: 'Inter-Regular.ttf',
  bodySemi: 'Inter-SemiBold.ttf',
  bodyBold: 'Inter-Bold.ttf',
  mono: 'IBMPlexMono-Medium.woff',
} as const;
type FontName = keyof typeof FONTS;
// Built-in PDF fonts, used only if a font file is missing from the deployment.
const FALLBACK: Record<FontName, string> = {
  display: 'Times-Bold',
  displayRegular: 'Times-Roman',
  displayItalic: 'Times-Italic',
  body: 'Helvetica',
  bodySemi: 'Helvetica-Bold',
  bodyBold: 'Helvetica-Bold',
  mono: 'Courier-Bold',
};

const TNUM = { features: ['tnum'] as PDFKit.Mixins.OpenTypeFeatures[] };

// ---------------------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------------------

export interface ResultsDocumentData {
  election: ElectionAnalytics['election'];
  registeredVoters: number;
  ballotsCast: number;
  abstainedVoters: number;
  turnoutPct: number;
  positions: PositionResult[];
  certifiedAt: string | null;
  /** Extra label/value rows shown under the key figures (the summary uses this). */
  details?: [string, string][];
}

interface PositionOutcome {
  seats: number;
  ranked: CandidateResult[];
  elected: CandidateResult[];
  /** Candidates level at the cut-off when a tie stops the last seat(s) being filled. */
  tiedAtCutoff: CandidateResult[];
  noVotes: boolean;
}

/** Who is elected, honouring ties: a tie at the cut-off fills only the seats clearly won. */
export function positionOutcome(position: PositionResult): PositionOutcome {
  const seats = Math.max(1, position.maxSelections);
  const ranked = [...position.candidates].sort((a, b) => b.voteCount - a.voteCount);
  const noVotes = ranked.every((c) => c.voteCount === 0);
  const lastIn = ranked[seats - 1];
  const firstOut = ranked[seats];
  const tied = !!lastIn && !!firstOut && lastIn.voteCount > 0 && lastIn.voteCount === firstOut.voteCount;
  if (tied) {
    const cutoff = lastIn.voteCount;
    return {
      seats,
      ranked,
      elected: ranked.filter((c) => c.voteCount > cutoff),
      tiedAtCutoff: ranked.filter((c) => c.voteCount === cutoff),
      noVotes,
    };
  }
  return { seats, ranked, elected: ranked.slice(0, seats).filter((c) => c.voteCount > 0), tiedAtCutoff: [], noVotes };
}

function lagos(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('en-GB', { ...opts, timeZone: TIME_ZONE });
}

function votingWindow(election: ElectionAnalytics['election']): string | null {
  const start = lagos(election.startTime, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const end = lagos(election.endTime, { hour: '2-digit', minute: '2-digit', hour12: false });
  const sameDay = election.startTime && election.endTime && lagos(election.startTime, { dateStyle: 'short' }) === lagos(election.endTime, { dateStyle: 'short' });
  if (start && end) return sameDay ? `${start} – ${end}` : `${start} – ${lagos(election.endTime, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}`;
  return start ?? null;
}

const n = (value: number) => value.toLocaleString('en-NG');
const pct = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;

/** "A", "A and B", "A, B and C". */
function listNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Fraunces can't place a stacked tone mark (e.g. the grave on "ọ̀" in Adébáyọ̀), so names that
 * need one are set in Inter, which can. Everything else keeps the display face.
 */
function needsMarkSupport(name: string): boolean {
  return /[̀-ͯ]/.test(name.normalize('NFC'));
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

// ---------------------------------------------------------------------------
// Candidate photos
// ---------------------------------------------------------------------------

const PHOTO_TIMEOUT_MS = 6000;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

function photoHostAllowed(url: URL): boolean {
  if (url.protocol !== 'https:') return false;
  // Photos live in the project's own Supabase Storage; never fetch anything else (no SSRF via photoUrl).
  const supabase = process.env.SUPABASE_URL;
  if (!supabase) return true;
  try {
    return url.host === new URL(supabase).host;
  } catch {
    return false;
  }
}

async function fetchPhoto(rawUrl: string): Promise<Buffer | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!photoHostAllowed(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > PHOTO_MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > PHOTO_MAX_BYTES) return null;
    const isPng = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    // PDFs can embed PNG and JPEG only; other formats (e.g. WebP) fall back to the initials badge.
    return isPng || isJpeg ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Downloads every candidate photo once, in parallel. A photo that can't be used is simply left out. */
export async function loadCandidatePhotos(positions: PositionResult[]): Promise<Map<string, Buffer>> {
  const urls = [...new Set(positions.flatMap((p) => p.candidates.map((c) => c.photoUrl).filter((u): u is string => !!u)))];
  const results = await Promise.all(urls.map(async (u) => [u, await fetchPhoto(u)] as const));
  return new Map(results.filter((r): r is readonly [string, Buffer] => r[1] !== null));
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

type Doc = PDFKit.PDFDocument;

class ResultsPdf {
  private readonly fontsOk: boolean;
  private readonly images = new Map<string, PDFKit.Mixins.ImageOption | unknown>();
  private readonly runningTitle: string;

  constructor(
    readonly doc: Doc,
    private readonly data: ResultsDocumentData,
    private readonly photos: Map<string, Buffer>,
    private readonly title: string
  ) {
    this.fontsOk = Object.values(FONTS).every((f) => fs.existsSync(path.join(FONT_DIR, f)));
    if (this.fontsOk) {
      for (const [name, file] of Object.entries(FONTS)) doc.registerFont(name, path.join(FONT_DIR, file));
    }
    this.runningTitle = `${title} · ${data.election.title}`;
  }

  font(name: FontName) {
    return this.doc.font(this.fontsOk ? name : FALLBACK[name]);
  }

  /** The display face for a name, unless the name has stacked tone marks the display face can't place. */
  nameFont(name: string, preferred: FontName) {
    return this.font(needsMarkSupport(name) && preferred.startsWith('display') ? 'bodySemi' : preferred);
  }

  /** Embeds each photo once and reuses it, however many times the candidate appears. */
  private image(url: string): unknown {
    if (!this.images.has(url)) {
      const buf = this.photos.get(url);
      try {
        this.images.set(url, buf ? (this.doc as unknown as { openImage(b: Buffer): unknown }).openImage(buf) : null);
      } catch {
        this.images.set(url, null);
      }
    }
    return this.images.get(url);
  }

  // ---- page furniture ----

  ensureSpace(height: number) {
    if (this.doc.y + height > BOTTOM) this.newPage();
  }

  newPage() {
    const { doc } = this;
    doc.addPage({ size: 'A4', margin: 0 });
    this.font('mono').fontSize(7).fillColor(C.faint).text(this.runningTitle.toUpperCase(), M, 28, { width: CONTENT_W, characterSpacing: 0.8, lineBreak: false, ellipsis: true });
    doc.moveTo(M, 42).lineTo(PAGE.width - M, 42).lineWidth(0.6).strokeColor(C.line).stroke();
    doc.y = TOP;
  }

  footers() {
    const { doc } = this;
    const range = doc.bufferedPageRange();
    const generated = lagos(new Date()) ?? '';
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const y = PAGE.height - 40;
      doc.moveTo(M, y - 8).lineTo(PAGE.width - M, y - 8).lineWidth(0.6).strokeColor(C.line).stroke();
      this.font('body').fontSize(7.5).fillColor(C.muted);
      doc.text(`${ORG_NAME} · Electronic Voting System · Generated ${generated} (Nigeria time)`, M, y, { width: CONTENT_W - 70, lineBreak: false });
      this.font('mono').fontSize(7.5).fillColor(C.muted);
      doc.text(`PAGE ${i + 1} OF ${range.count}`, PAGE.width - M - 70, y, { width: 70, align: 'right', lineBreak: false });
    }
  }

  // ---- building blocks ----

  avatar(c: CandidateResult, cx: number, cy: number, r: number, ring?: string) {
    const { doc } = this;
    const img = c.photoUrl ? this.image(c.photoUrl) : null;
    if (ring) doc.circle(cx, cy, r + Math.max(1.5, r * 0.07)).fillColor(ring).fill();
    if (img) {
      doc.save();
      doc.circle(cx, cy, r).clip();
      doc.image(img as never, cx - r, cy - r, { cover: [r * 2, r * 2], align: 'center', valign: 'center' });
      doc.restore();
    } else {
      doc.circle(cx, cy, r).fillColor(ring ? C.white : C.tealSoft).fill();
      if (ring) doc.circle(cx, cy, r).fillColor(C.tealSoft).fill();
      const size = r * 0.78;
      this.font('display').fontSize(size).fillColor(C.teal);
      doc.text(initials(c.name), cx - r, cy - size * 0.62, { width: r * 2, align: 'center', lineBreak: false });
    }
  }

  pill(text: string, x: number, y: number, bg: string, fg: string, opts: { outline?: boolean } = {}) {
    const { doc } = this;
    this.font('mono').fontSize(7);
    const w = doc.widthOfString(text, { characterSpacing: 0.9 }) + 16;
    if (opts.outline) doc.roundedRect(x, y, w, 16, 8).lineWidth(0.8).strokeColor(bg).stroke();
    else doc.roundedRect(x, y, w, 16, 8).fillColor(bg).fill();
    doc.fillColor(fg).text(text, x + 8, y + 4.6, { characterSpacing: 0.9, lineBreak: false });
    return w;
  }

  eyebrow(text: string, x: number, y: number, color = C.muted, width?: number) {
    this.font('mono').fontSize(7).fillColor(color);
    this.doc.text(text.toUpperCase(), x, y, { characterSpacing: 0.9, lineBreak: false, ...(width ? { width, ellipsis: true } : {}) });
  }

  // ---- sections ----

  coverBand() {
    const { doc, data } = this;
    const bandH = 168;
    doc.rect(0, 0, PAGE.width, bandH).fillColor(C.teal).fill();
    doc.rect(0, bandH, PAGE.width, 3).fillColor(C.gold).fill();

    if (fs.existsSync(LOGO_PATH)) {
      doc.circle(M + 26, 52, 27).fillColor(C.white).fill();
      doc.image(LOGO_PATH, M + 4, 30, { width: 44, height: 44 });
    }
    this.eyebrow(ORG_NAME, M + 66, 38, C.tealText);
    this.eyebrow('Electoral Committee', M + 66, 50, C.tealText);

    const certified = !!data.certifiedAt;
    const status = certified ? 'CERTIFIED RESULTS' : data.election.status === 'ACTIVE' ? 'LIVE · PROVISIONAL' : 'PROVISIONAL';
    this.font('mono').fontSize(7);
    const pillW = doc.widthOfString(status, { characterSpacing: 0.9 }) + 16;
    if (certified) this.pill(status, PAGE.width - M - pillW, 36, C.gold, C.ink);
    else this.pill(status, PAGE.width - M - pillW, 36, C.tealText, C.white, { outline: true });

    this.font('display').fontSize(30).fillColor(C.white);
    doc.text(this.title, M, 88, { width: CONTENT_W, lineBreak: false });
    this.font('body').fontSize(11).fillColor(C.tealText);
    const window = votingWindow(data.election);
    doc.text([data.election.title, window].filter(Boolean).join('   ·   '), M, 128, { width: CONTENT_W, lineBreak: false, ellipsis: true });
    if (certified) {
      this.font('body').fontSize(8).fillColor(C.tealText);
      doc.text(`Certified ${lagos(data.certifiedAt)} (Nigeria time). These figures are final.`, M, 146, { width: CONTENT_W, lineBreak: false });
    } else {
      this.font('body').fontSize(8).fillColor(C.tealText);
      doc.text('Provisional: these figures are not yet certified and may change.', M, 146, { width: CONTENT_W, lineBreak: false });
    }
    doc.y = bandH + 26;
  }

  keyFigures() {
    const { doc, data } = this;
    const y = doc.y;
    const tiles: [string, string][] = [
      ['Registered voters', n(data.registeredVoters)],
      ['Ballots cast', n(data.ballotsCast)],
      ['Turnout', pct(data.turnoutPct)],
      ['Positions', n(data.positions.length)],
    ];
    const w = CONTENT_W / tiles.length;
    tiles.forEach(([label, value], i) => {
      const x = M + i * w;
      if (i > 0) doc.moveTo(x, y + 2).lineTo(x, y + 52).lineWidth(0.6).strokeColor(C.line).stroke();
      const pad = i === 0 ? 0 : 16;
      this.eyebrow(label, x + pad, y + 2);
      this.font('display').fontSize(26).fillColor(i === 2 ? C.teal : C.ink);
      doc.text(value, x + pad, y + 15, { lineBreak: false, ...TNUM });
      if (i === 2) {
        const barW = w - pad - 18;
        doc.roundedRect(x + pad, y + 50, barW, 4, 2).fillColor(C.tint).fill();
        doc.roundedRect(x + pad, y + 50, Math.max(3, (Math.min(100, data.turnoutPct) / 100) * barW), 4, 2).fillColor(C.teal).fill();
      }
    });
    doc.y = y + 70;

    if (data.details?.length) {
      const rowY = doc.y;
      const colW = CONTENT_W / 2;
      data.details.forEach(([label, value], i) => {
        const x = M + (i % 2) * colW;
        const yy = rowY + Math.floor(i / 2) * 18;
        this.font('body').fontSize(8.5).fillColor(C.muted);
        doc.text(label, x, yy, { width: 120, lineBreak: false });
        this.font('bodySemi').fontSize(8.5).fillColor(C.ink);
        doc.text(value, x + 122, yy, { width: colW - 130, lineBreak: false, ellipsis: true });
      });
      doc.y = rowY + Math.ceil(data.details.length / 2) * 18 + 8;
    }
  }

  sectionHeading(kicker: string, title: string) {
    const { doc } = this;
    const y = doc.y;
    doc.moveTo(M, y).lineTo(PAGE.width - M, y).lineWidth(1.2).strokeColor(C.ink).stroke();
    this.eyebrow(kicker, M, y + 10);
    this.font('display').fontSize(19).fillColor(C.ink);
    doc.text(title, M, y + 24, { width: CONTENT_W, lineBreak: false, ellipsis: true });
    doc.y = y + 58;
  }

  /** One line per position with its winner: the page to read if you read nothing else. */
  atAGlance() {
    const { doc, data } = this;
    const rowH = 40;
    this.ensureSpace(60 + Math.min(4, data.positions.length) * rowH);
    this.sectionHeading('Results at a glance', 'Who was elected');
    data.positions.forEach((position, index) => {
      this.ensureSpace(rowH);
      const y = doc.y;
      const o = positionOutcome(position);
      if (index % 2 === 0) doc.rect(M - 8, y, CONTENT_W + 16, rowH).fillColor(C.tint).fill();
      this.eyebrow(position.title, M, y + 16, C.muted, 150);

      const nameX = M + 196;
      if (o.noVotes) {
        this.font('body').fontSize(10).fillColor(C.faint);
        doc.text('No votes cast', nameX, y + 14, { lineBreak: false });
      } else if (o.elected.length === 0 && o.tiedAtCutoff.length) {
        doc.circle(M + 176, y + rowH / 2, 13).fillColor(C.warnSoft).fill();
        this.font('bodyBold').fontSize(11).fillColor(C.warn);
        doc.text('=', M + 170, y + 13, { width: 12, align: 'center', lineBreak: false });
        this.font('bodySemi').fontSize(10.5).fillColor(C.warn);
        doc.text(`Tie: ${listNames(o.tiedAtCutoff.map((c) => c.name))}`, nameX, y + 13, { width: CONTENT_W - 196 - 110, lineBreak: false, ellipsis: true });
        this.font('body').fontSize(8).fillColor(C.warn);
        doc.text(`${plural(o.tiedAtCutoff[0]!.voteCount, 'vote')} each`, PAGE.width - M - 110, y + 15, { width: 110, align: 'right', lineBreak: false, ...TNUM });
      } else {
        const lead = o.elected[0]!;
        this.avatar(lead, M + 176, y + rowH / 2, 13);
        const names = o.elected.map((c) => c.name).join(', ') + (o.tiedAtCutoff.length ? ' + a tie' : '');
        this.nameFont(names, 'display').fontSize(12).fillColor(C.ink);
        doc.text(names, nameX, y + 12, { width: CONTENT_W - 196 - 110, lineBreak: false, ellipsis: true });
        if (o.seats > 1) {
          this.font('bodySemi').fontSize(9.5).fillColor(C.ink);
          doc.text(`${o.elected.length} of ${o.seats} seats`, PAGE.width - M - 110, y + 10, { width: 110, align: 'right', lineBreak: false, ...TNUM });
          this.font('body').fontSize(8).fillColor(C.muted);
          doc.text(o.elected.length === o.seats ? 'all filled' : 'filled so far', PAGE.width - M - 110, y + 23, { width: 110, align: 'right', lineBreak: false });
        } else {
          this.font('bodySemi').fontSize(9.5).fillColor(C.ink);
          doc.text(plural(lead.voteCount, 'vote'), PAGE.width - M - 110, y + 10, { width: 110, align: 'right', lineBreak: false, ...TNUM });
          this.font('body').fontSize(8).fillColor(C.muted);
          doc.text(`${pct(lead.pct)} of ballots`, PAGE.width - M - 110, y + 23, { width: 110, align: 'right', lineBreak: false, ...TNUM });
        }
      }
      doc.y = y + rowH;
    });
    doc.y += 26;
  }

  winnerCard(position: PositionResult, o: PositionOutcome) {
    const { doc } = this;
    const runnerUp = o.ranked[o.elected.length];

    if (o.noVotes) {
      const y = doc.y;
      doc.roundedRect(M, y, CONTENT_W, 46, 10).fillColor(C.tint).fill();
      this.font('body').fontSize(10).fillColor(C.muted);
      doc.text('No votes were cast for this position.', M + 18, y + 17, { lineBreak: false });
      doc.y = y + 60;
      return;
    }

    if (o.elected.length === 1 && o.seats === 1) {
      const c = o.elected[0]!;
      const h = 124;
      const y = doc.y;
      doc.roundedRect(M, y, CONTENT_W, h, 12).fillColor(C.tealSoft).fill();
      this.avatar(c, M + 70, y + h / 2, 44, C.gold);
      const x = M + 136;
      this.pill('ELECTED', x, y + 22, C.gold, C.ink);
      this.nameFont(c.name, 'display').fontSize(22).fillColor(C.ink);
      doc.text(c.name, x, y + 44, { width: CONTENT_W - 150, lineBreak: false, ellipsis: true });
      this.font('bodySemi').fontSize(11).fillColor(C.teal);
      doc.text(`${plural(c.voteCount, 'vote')}  ·  ${pct(c.pct)} of ballots cast`, x, y + 74, { lineBreak: false, ...TNUM });
      if (runnerUp && runnerUp.voteCount >= 0) {
        const margin = c.voteCount - runnerUp.voteCount;
        this.font('body').fontSize(9).fillColor(C.muted);
        doc.text(`Won by ${plural(margin, 'vote')} over ${runnerUp.name}`, x, y + 93, { width: CONTENT_W - 150, lineBreak: false, ellipsis: true, ...TNUM });
      }
      doc.y = y + h + 16;
      return;
    }

    // Several seats, or a tie: elected candidates as cards, then a tie notice if needed.
    if (o.elected.length) {
      const perRow = 3;
      const gap = 10;
      const cardW = (CONTENT_W - gap * (perRow - 1)) / perRow;
      const cardH = 132;
      for (let i = 0; i < o.elected.length; i += perRow) {
        this.ensureSpace(cardH + 10);
        const y = doc.y;
        o.elected.slice(i, i + perRow).forEach((c, j) => {
          const x = M + j * (cardW + gap);
          doc.roundedRect(x, y, cardW, cardH, 12).fillColor(C.tealSoft).fill();
          this.avatar(c, x + cardW / 2, y + 40, 26, C.gold);
          this.nameFont(c.name, 'display').fontSize(12.5).fillColor(C.ink);
          doc.text(c.name, x + 10, y + 76, { width: cardW - 20, align: 'center', lineBreak: false, ellipsis: true });
          this.font('bodySemi').fontSize(9).fillColor(C.teal);
          doc.text(`${plural(c.voteCount, 'vote')} · ${pct(c.pct)}`, x + 10, y + 95, { width: cardW - 20, align: 'center', lineBreak: false, ...TNUM });
          this.font('mono').fontSize(6.5);
          const label = `ELECTED · SEAT ${i + j + 1}`;
          const lw = doc.widthOfString(label, { characterSpacing: 0.9 }) + 16;
          this.pill(label, x + (cardW - lw) / 2, y + 110, C.gold, C.ink);
        });
        doc.y = y + cardH + 10;
      }
    }
    if (o.tiedAtCutoff.length) {
      const open = o.seats - o.elected.length;
      const level = `${listNames(o.tiedAtCutoff.map((c) => c.name))} are level on ${plural(o.tiedAtCutoff[0]!.voteCount, 'vote')}.`;
      const text = o.elected.length
        ? `${level} ${open === 1 ? 'The last seat stays' : `The last ${open} seats stay`} empty until the Electoral Committee resolves the tie.`
        : `${level} No winner can be declared until the Electoral Committee resolves the tie.`;
      this.font('body').fontSize(9.5);
      const h = doc.heightOfString(text, { width: CONTENT_W - 60 }) + 40;
      this.ensureSpace(h + 10);
      const y = doc.y;
      doc.roundedRect(M, y, CONTENT_W, h, 10).fillColor(C.warnSoft).fill();
      this.font('bodyBold').fontSize(10.5).fillColor(C.warn);
      doc.text(o.elected.length ? 'Tie for the last seat' : 'Tie: no winner declared', M + 18, y + 13, { lineBreak: false });
      this.font('body').fontSize(9.5).fillColor(C.ink);
      doc.text(text, M + 18, y + 29, { width: CONTENT_W - 36 });
      doc.y = y + h + 12;
    }
  }

  resultsTable(position: PositionResult, o: PositionOutcome) {
    const { doc } = this;
    const cols = { rank: M, avatar: M + 26, name: M + 46, bar: M + 230, votes: PAGE.width - M - 110, share: PAGE.width - M - 46 };
    const barW = cols.votes - cols.bar - 18;
    const rowH = 26;
    const electedIds = new Set(o.elected.map((c) => c.id));
    const tiedIds = new Set(o.tiedAtCutoff.map((c) => c.id));
    const top = Math.max(1, ...o.ranked.map((c) => c.voteCount));

    const header = () => {
      const y = doc.y;
      this.eyebrow('#', cols.rank, y);
      this.eyebrow('Candidate', cols.name, y);
      this.eyebrow('Share of ballots', cols.bar, y);
      this.font('mono').fontSize(7).fillColor(C.muted);
      doc.text('VOTES', cols.votes, y, { width: 56, align: 'right', characterSpacing: 0.9, lineBreak: false });
      doc.text('SHARE', cols.share, y, { width: 46, align: 'right', characterSpacing: 0.9, lineBreak: false });
      doc.moveTo(M, y + 13).lineTo(PAGE.width - M, y + 13).lineWidth(0.6).strokeColor(C.line).stroke();
      doc.y = y + 17;
    };

    this.ensureSpace(rowH * 2 + 20);
    header();
    o.ranked.forEach((c, i) => {
      if (doc.y + rowH > BOTTOM) {
        this.newPage();
        header();
      }
      const y = doc.y;
      const mid = y + rowH / 2;
      const isElected = electedIds.has(c.id);
      const isTied = tiedIds.has(c.id);
      this.font('mono').fontSize(8).fillColor(isElected ? C.teal : C.faint);
      doc.text(String(i + 1), cols.rank, mid - 4, { lineBreak: false });
      this.avatar(c, cols.avatar + 9, mid, 9);
      this.font(isElected ? 'bodyBold' : 'body').fontSize(9.5).fillColor(C.ink);
      const tag = isElected ? '  ELECTED' : isTied ? '  TIED' : '';
      doc.text(c.name, cols.name, mid - 5.5, { width: cols.bar - cols.name - 12 - (tag ? 50 : 0), lineBreak: false, ellipsis: true });
      if (tag) {
        const nameW = Math.min(doc.widthOfString(c.name), cols.bar - cols.name - 62);
        this.font('mono').fontSize(6).fillColor(isElected ? C.goldInk : C.warn);
        doc.text(tag.trim(), cols.name + nameW + 6, mid - 3, { characterSpacing: 0.8, lineBreak: false });
      }
      doc.roundedRect(cols.bar, mid - 3, barW, 6, 3).fillColor(C.tint).fill();
      if (c.voteCount > 0) {
        doc.roundedRect(cols.bar, mid - 3, Math.max(4, (c.voteCount / top) * barW), 6, 3).fillColor(isElected ? C.teal : isTied ? C.gold : C.faint).fill();
      }
      this.font(isElected ? 'bodyBold' : 'bodySemi').fontSize(9.5).fillColor(C.ink);
      doc.text(n(c.voteCount), cols.votes, mid - 5.5, { width: 56, align: 'right', lineBreak: false, ...TNUM });
      this.font('body').fontSize(9).fillColor(C.muted);
      doc.text(pct(c.pct), cols.share, mid - 5, { width: 46, align: 'right', lineBreak: false, ...TNUM });
      doc.moveTo(cols.name, y + rowH).lineTo(PAGE.width - M, y + rowH).lineWidth(0.4).strokeColor(C.line).stroke();
      doc.y = y + rowH;
    });

    this.ensureSpace(22);
    const y = doc.y + 6;
    this.font('displayItalic').fontSize(9).fillColor(C.muted);
    doc.text(`Left blank (abstained on this position): ${n(position.abstentions)}`, cols.name, y, { lineBreak: false, ...TNUM });
    this.font('body').fontSize(7.5).fillColor(C.faint);
    doc.text('Share = votes ÷ all ballots cast', cols.name, y, { width: PAGE.width - M - cols.name, align: 'right', lineBreak: false });
    doc.y = y + 30;
  }

  position(position: PositionResult, index: number, total: number) {
    const o = positionOutcome(position);
    // Keep the heading, winner card and first rows together.
    this.ensureSpace(o.seats > 1 ? 300 : 260);
    const seatsLabel = o.seats === 1 ? '1 seat' : `${o.seats} seats`;
    this.sectionHeading(`Position ${index + 1} of ${total} · ${seatsLabel}`, position.title);
    this.winnerCard(position, o);
    this.resultsTable(position, o);
  }

  certification() {
    const { doc, data } = this;
    this.ensureSpace(170);
    this.sectionHeading('Declaration', 'Certification of results');
    const textY = doc.y;
    this.font('body').fontSize(9.5).fillColor(C.ink);
    doc.text(
      `We, the undersigned members of the ${ORG_NAME} Electoral Committee, certify that the results above are a true and complete record of the ballots cast in the ${data.election.title}.`,
      M,
      textY,
      { width: CONTENT_W, lineGap: 2 }
    );
    const y = doc.y + 44;
    const colW = (CONTENT_W - 30) / 2;
    ['Chairman, Electoral Committee', 'Secretary, Electoral Committee'].forEach((role, i) => {
      const x = M + i * (colW + 30);
      doc.moveTo(x, y).lineTo(x + colW * 0.62, y).lineWidth(0.8).strokeColor(C.ink).stroke();
      doc.moveTo(x + colW * 0.7, y).lineTo(x + colW, y).lineWidth(0.8).strokeColor(C.ink).stroke();
      this.eyebrow('Signature', x, y + 6);
      this.eyebrow('Date', x + colW * 0.7, y + 6);
      this.font('bodySemi').fontSize(9).fillColor(C.ink);
      doc.text(role, x, y + 20, { width: colW, lineBreak: false });
    });
    doc.y = y + 44;
  }
}

function startDocument(res: Response, filename: string): Doc {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, autoFirstPage: true, info: { Title: filename.replace(/\.pdf$/, ''), Author: ORG_NAME } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

/** Draws the full results document onto an open PDFKit document (exported for previews and tests). */
export function drawResults(doc: Doc, data: ResultsDocumentData, photos: Map<string, Buffer>, title: string, opts: { glance?: boolean; certification?: boolean } = {}) {
  const pdf = new ResultsPdf(doc, data, photos, title);
  pdf.coverBand();
  pdf.keyFigures();
  if (opts.glance !== false && data.positions.length > 1) pdf.atAGlance();
  data.positions.forEach((p, i) => pdf.position(p, i, data.positions.length));
  if (data.positions.length === 0) {
    pdf.font('body').fontSize(10).fillColor(C.muted);
    doc.text('No positions have been set up for this election.', M, doc.y);
  }
  if (opts.certification !== false) pdf.certification();
  pdf.footers();
}

export async function renderResultsPdf(data: ResultsDocumentData, res: Response, opts: { filename: string; title: string }) {
  const photos = await loadCandidatePhotos(data.positions);
  const doc = startDocument(res, opts.filename);
  drawResults(doc, data, photos, opts.title);
  doc.end();
}
