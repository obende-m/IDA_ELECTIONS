/**
 * "I have voted" card: a 1080x1350 PNG drawn in the browser after a ballot is confirmed, for voters
 * to share in the association's groups. Deliberately carries no reference number and no choices:
 * only the voter's name (if they want it), the election and the date.
 */

const W = 1080;
const H = 1350;
const C = {
  tealTop: '#11564e',
  tealBottom: '#0a3530',
  cream: '#fbf6e9',
  creamSoft: 'rgba(251, 246, 233, 0.78)',
  gold: '#e2c870',
  goldDeep: '#c9a23a',
  ink: '#0f4c45',
};
const SERIF = 'Fraunces, Georgia, "Times New Roman", serif';
const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

export interface VotedCardInput {
  /** Shown on the card's badge; null hides the name. */
  name: string | null;
  electionLabel: string;
  date: Date;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  await Promise.all(
    [`600 136px Fraunces`, `500 48px Fraunces`, `400 34px Inter`, `600 40px Inter`].map((f) => document.fonts.load(f).catch(() => undefined))
  );
}

/** Largest font size (down to `min`) at which `text` fits in `maxWidth`. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, start: number, min: number, maxWidth: number): number {
  let size = start;
  ctx.font = font(size);
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

/** Splits text into at most two centred lines that fit `maxWidth`. */
function twoLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  let best: string[] = [text];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    if (wa <= maxWidth && wb <= maxWidth && Math.abs(wa - wb) < bestDiff) {
      best = [a, b];
      bestDiff = Math.abs(wa - wb);
    }
  }
  return best;
}

function spaced(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is newer canvas API; older browsers just ignore it.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, bg: string, fg: string) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.34);
  ctx.lineTo(cx + r * 0.47, cy - r * 0.3);
  ctx.strokeStyle = fg;
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export async function drawVotedCard(input: VotedCardInput): Promise<Blob> {
  const [logo] = await Promise.all([loadImage('/logo-mark.png'), ensureFonts()]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Background: deep teal with a warm glow behind the crest.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, C.tealTop);
  bg.addColorStop(1, C.tealBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 270, 40, W / 2, 270, 560);
  glow.addColorStop(0, 'rgba(226, 200, 112, 0.22)');
  glow.addColorStop(1, 'rgba(226, 200, 112, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Ripples around the crest: one vote, spreading outwards.
  for (const [r, a] of [[160, 0.16], [228, 0.11], [300, 0.07], [376, 0.045]] as const) {
    ctx.beginPath();
    ctx.arc(W / 2, 270, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(243, 230, 189, ${a})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Inset frame.
  ctx.beginPath();
  ctx.roundRect(36, 36, W - 72, H - 72, 30);
  ctx.strokeStyle = 'rgba(226, 200, 112, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Crest.
  ctx.beginPath();
  ctx.arc(W / 2, 270, 122, 0, Math.PI * 2);
  ctx.fillStyle = C.gold;
  ctx.fill();
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 270, 112, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, W / 2 - 114, 270 - 114, 228, 228);
    ctx.restore();
  }

  // Eyebrow.
  spaced(ctx, 7);
  ctx.font = `600 25px ${SANS}`;
  ctx.fillStyle = C.gold;
  ctx.fillText('IGARRA DEVELOPMENT ASSOCIATION', W / 2 + 3.5, 462);
  spaced(ctx, 0);

  // Headline: "I have voted." with "voted." in gold.
  ctx.font = `600 136px ${SERIF}`;
  const a = 'I have ';
  const b = 'voted.';
  const wa = ctx.measureText(a).width;
  const wb = ctx.measureText(b).width;
  const x0 = W / 2 - (wa + wb) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.cream;
  ctx.fillText(a, x0, 618);
  ctx.fillStyle = C.gold;
  ctx.fillText(b, x0 + wa, 618);
  ctx.textAlign = 'center';

  // Gold rule.
  ctx.fillStyle = C.goldDeep;
  ctx.fillRect(W / 2 - 60, 660, 120, 4);

  // Election.
  ctx.font = `400 34px ${SANS}`;
  ctx.fillStyle = C.creamSoft;
  ctx.fillText('I cast my vote in the', W / 2, 735);
  const titleSize = fit(ctx, input.electionLabel, (s) => `500 ${s}px ${SERIF}`, 50, 40, 900);
  const titleLines = twoLines(ctx, input.electionLabel, 900);
  ctx.fillStyle = C.cream;
  titleLines.forEach((line, i) => ctx.fillText(line, W / 2, 800 + i * (titleSize + 10)));
  let y = 800 + (titleLines.length - 1) * (titleSize + 10);

  // Name badge (cream pill with a check), or a generic member badge.
  const label = input.name?.trim() || 'Proud IDA member';
  y += 70;
  const nameSize = fit(ctx, label, (s) => `600 ${s}px ${SANS}`, 40, 26, 720);
  const textW = ctx.measureText(label).width;
  const pillH = 92;
  const pillW = Math.min(W - 160, textW + 92 + 64);
  const px = W / 2 - pillW / 2;
  ctx.beginPath();
  ctx.roundRect(px, y, pillW, pillH, pillH / 2);
  ctx.fillStyle = C.cream;
  ctx.fill();
  check(ctx, px + 46, y + pillH / 2, 26, C.ink, C.cream);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink;
  ctx.font = `600 ${nameSize}px ${SANS}`;
  ctx.fillText(label, px + 46 + 26 + 22, y + pillH / 2 + nameSize * 0.36);
  ctx.textAlign = 'center';

  // Date.
  ctx.font = `400 28px ${SANS}`;
  ctx.fillStyle = 'rgba(251, 246, 233, 0.62)';
  const date = input.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });
  ctx.fillText(date, W / 2, y + pillH + 58);

  // Call to action.
  ctx.fillStyle = 'rgba(226, 200, 112, 0.35)';
  ctx.fillRect(120, 1140, W - 240, 1.5);
  ctx.font = `600 46px ${SERIF}`;
  ctx.fillStyle = C.gold;
  ctx.fillText('Have you voted yet?', W / 2, 1210);
  ctx.font = `400 29px ${SANS}`;
  ctx.fillStyle = C.creamSoft;
  ctx.fillText('Use the personal voting link sent to you.', W / 2, 1262);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'));
}
