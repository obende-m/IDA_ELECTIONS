import twilio from 'twilio';
import { envValue, TwilioSendError, type InviteDetails, type SendResult } from './whatsapp';

/**
 * Automatic SMS sending through Twilio. Server-only, like lib/whatsapp.ts; the message text is never
 * logged or stored because it carries the voter's live voting link.
 *
 * Nigeria specifics (Twilio's NG SMS guidelines): send from an Alphanumeric Sender ID (a name, max 11
 * characters), not a phone number; unregistered sender IDs are delivered best-effort and may be
 * replaced by a short code. Avoid international brand names (e.g. WhatsApp) in the text: they trigger
 * operator filtering.
 */

export interface SmsConfig {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  from: string; // Alphanumeric Sender ID (e.g. IDAElection) or an E.164 number
  statusCallback?: string;
}

export function getSmsConfig(env: NodeJS.ProcessEnv = process.env): SmsConfig | null {
  if (env.SMS_ENABLED !== 'true') return null;
  const TWILIO_ACCOUNT_SID = envValue(env.TWILIO_ACCOUNT_SID);
  const TWILIO_API_KEY_SID = envValue(env.TWILIO_API_KEY_SID);
  const TWILIO_API_KEY_SECRET = envValue(env.TWILIO_API_KEY_SECRET);
  const TWILIO_SMS_FROM = envValue(env.TWILIO_SMS_FROM);
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET || !TWILIO_SMS_FROM) return null;
  return {
    accountSid: TWILIO_ACCOUNT_SID,
    apiKeySid: TWILIO_API_KEY_SID,
    apiKeySecret: TWILIO_API_KEY_SECRET,
    from: TWILIO_SMS_FROM,
    statusCallback: env.PUBLIC_SERVER_URL ? `${env.PUBLIC_SERVER_URL.replace(/\/$/, '')}/api/twilio/status` : undefined,
  };
}

/** One GSM-7 segment: the price of one SMS. */
export const SMS_ONE_PART = 160;
/** Two GSM-7 segments. Anything longer costs a third segment per voter. */
export const SMS_MAX_CHARS = 306;

/**
 * Reduces text to plain characters so the SMS stays in the GSM-7 alphabet (160 chars/segment).
 * A single character outside it (an accent, a curly quote) switches the whole message to UCS-2,
 * which drops the segment size to 70 and roughly doubles the cost.
 */
export function toPlainSmsText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents: é -> e
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, '') // drop anything else non-ASCII
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function formatClosesShort(endTime: Date | null): string | null {
  if (!endTime || Number.isNaN(endTime.getTime())) return null;
  return endTime.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Lagos' });
}

/**
 * The shortest invite that still reads well. Prefers a single SMS segment (160 chars: half the cost),
 * dropping the closing time and then the name to get there; current links (43-char tokens) always fit.
 * Older, longer links fall back to a two-segment version with the election title.
 */
export function inviteSmsText(d: InviteDetails): string {
  const firstName = toPlainSmsText(d.fullName.split(/\s+/).filter(Boolean)[0] || 'Member') || 'Member';
  const title = toPlainSmsText(d.electionTitle || '');
  const closes = formatClosesShort(d.endTime);

  const onePart = [
    ...(closes ? [`${firstName}, your IDA voting link:\n${d.votingLink}\nWorks once. Do not share. Closes ${closes}.`] : []),
    `Dear ${firstName}, your IDA voting link:\n${d.votingLink}\nWorks once. Do not share.`,
    `Your IDA voting link:\n${d.votingLink}\nWorks once. Do not share.`,
  ];
  const fit = onePart.find((text) => text.length <= SMS_ONE_PART);
  if (fit) return fit;

  const build = (withTitle: boolean, withCloses: boolean) =>
    [
      `Dear ${firstName}, your personal voting link${withTitle && title ? ` for the ${title}` : ''}:`,
      d.votingLink,
      `It works once. Do not share it.${withCloses && closes ? ` Closes ${closes}.` : ''}`,
      '- IDA Electoral Committee',
    ].join('\n');

  for (const [withTitle, withCloses] of [[true, true], [true, false], [false, false]] as const) {
    const text = build(withTitle, withCloses);
    if (text.length <= SMS_MAX_CHARS) return text;
  }
  return build(false, false);
}

let cachedClient: { key: string; client: ReturnType<typeof twilio> } | null = null;
function clientFor(config: SmsConfig) {
  const key = `${config.accountSid}:${config.apiKeySid}`;
  if (!cachedClient || cachedClient.key !== key) {
    cachedClient = { key, client: twilio(config.apiKeySid, config.apiKeySecret, { accountSid: config.accountSid }) };
  }
  return cachedClient.client;
}

export async function sendSmsInvite(config: SmsConfig, toE164Number: string, details: InviteDetails): Promise<SendResult> {
  try {
    const message = await clientFor(config).messages.create({
      from: config.from,
      to: toE164Number,
      body: inviteSmsText(details),
      smartEncoded: true,
      ...(config.statusCallback ? { statusCallback: config.statusCallback } : {}),
    });
    return { sid: message.sid, status: message.status };
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err && err.code != null ? String((err as { code: unknown }).code) : null;
    throw new TwilioSendError(err instanceof Error ? err.message : 'Unknown Twilio error', code);
  }
}
