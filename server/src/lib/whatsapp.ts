import twilio from 'twilio';

/**
 * Automatic WhatsApp sending through Twilio. Server-only: credentials come from env vars (set on
 * Render, never in the client bundle), and the message text is never logged or stored here because
 * it carries the voter's live voting link.
 *
 * Two modes, picked by env:
 *  - Template mode (TWILIO_INVITE_CONTENT_SID set): sends the Meta-approved invite template. This is
 *    the only mode that works for the real election (business-initiated WhatsApp needs a template).
 *  - Sandbox mode (no content SID): sends the invite as plain text. Only for testing with the Twilio
 *    WhatsApp Sandbox, and only to phones that messaged the sandbox in the last 24 hours.
 */

export interface WhatsappConfig {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  from: string; // whatsapp:+E164
  contentSid?: string;
  statusCallback?: string;
}

/**
 * A setting as pasted into Render: trims spaces/newlines and one pair of surrounding quotes, so
 * "ACxxxx" copied from .env.example works the same as ACxxxx. Empty after cleaning = not set.
 */
export function envValue(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let v = value.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) v = v.slice(1, -1).trim();
  return v || undefined;
}

export function getWhatsappConfig(env: NodeJS.ProcessEnv = process.env): WhatsappConfig | null {
  if (env.WHATSAPP_ENABLED !== 'true') return null;
  const TWILIO_ACCOUNT_SID = envValue(env.TWILIO_ACCOUNT_SID);
  const TWILIO_API_KEY_SID = envValue(env.TWILIO_API_KEY_SID);
  const TWILIO_API_KEY_SECRET = envValue(env.TWILIO_API_KEY_SECRET);
  const TWILIO_WHATSAPP_FROM = envValue(env.TWILIO_WHATSAPP_FROM);
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET || !TWILIO_WHATSAPP_FROM) return null;
  const from = TWILIO_WHATSAPP_FROM.startsWith('whatsapp:') ? TWILIO_WHATSAPP_FROM : `whatsapp:${TWILIO_WHATSAPP_FROM}`;
  return {
    accountSid: TWILIO_ACCOUNT_SID,
    apiKeySid: TWILIO_API_KEY_SID,
    apiKeySecret: TWILIO_API_KEY_SECRET,
    from,
    contentSid: envValue(env.TWILIO_INVITE_CONTENT_SID),
    statusCallback: env.PUBLIC_SERVER_URL ? `${env.PUBLIC_SERVER_URL.replace(/\/$/, '')}/api/twilio/status` : undefined,
  };
}

export function whatsappMode(config: WhatsappConfig | null): 'off' | 'sandbox' | 'template' {
  if (!config) return 'off';
  return config.contentSid ? 'template' : 'sandbox';
}

/**
 * Turns a number as typed in the voter roll (08012345678, +234 801 234 5678, 2348012345678, 8012345678)
 * into E.164 (+2348012345678). Same rules as the client's whatsappNumber(). Returns null when it can't be a real number.
 */
export function toE164(phone: string | null | undefined, defaultCountryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '234'): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (raw.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (!digits.startsWith(defaultCountryCode) && digits.length <= 10) {
    digits = defaultCountryCode + digits;
  }
  return digits.length >= 11 && digits.length <= 15 ? `+${digits}` : null;
}

export interface InviteDetails {
  fullName: string;
  electionTitle: string;
  endTime: Date | null;
  rawToken: string;
  votingLink: string;
}

/** Template variables must be single-line; WhatsApp rejects newlines/tabs and long runs of spaces in them. */
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function formatCloses(endTime: Date | null): string | null {
  if (!endTime || Number.isNaN(endTime.getTime())) return null;
  // The server runs in UTC on Render; voters are in Nigeria, so always show Lagos time.
  return endTime.toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' });
}

/**
 * Variables for the approved invite template. The template is expected to read:
 *   "Dear {{1}}, you are invited to vote in the {{2}}. Voting closes {{3}}. Tap the button below to
 *    open your personal voting link. It works for one vote only, so please do not share or forward
 *    this message."
 * with a URL button "Vote now" -> {VOTING_LINK_BASE_URL}/vote/{{4}}
 */
export function inviteTemplateVariables(d: InviteDetails): Record<string, string> {
  return {
    '1': oneLine(d.fullName.trim().split(/\s+/)[0] || 'Member'),
    '2': oneLine(d.electionTitle || 'IDA election'),
    '3': oneLine(formatCloses(d.endTime) ?? 'at the time announced by the committee'),
    '4': d.rawToken,
  };
}

/** Plain-text invite for Sandbox testing; mirrors the client's buildInviteMessage(). */
export function inviteSandboxText(d: InviteDetails): string {
  const firstName = d.fullName.trim().split(/\s+/)[0] || 'Member';
  const closes = formatCloses(d.endTime);
  return [
    `Dear ${firstName},`,
    '',
    `You are invited to vote in the ${d.electionTitle || 'IDA election'}.`,
    '',
    'Below is your personal voting link:',
    '',
    d.votingLink,
    '',
    'This link is only for you. Please do not share it or forward it to anyone. It works for one vote only.',
    ...(closes ? ['', `Voting closes: ${closes}.`] : []),
    '',
    'Thank you.',
    'IDA Electoral Committee',
  ].join('\n');
}

export interface SendResult {
  sid: string;
  status: string;
}

/** Thrown for any Twilio failure. `code` is Twilio's error code (e.g. 63016, 21211) when it gave one. */
export class TwilioSendError extends Error {
  constructor(message: string, public readonly code: string | null) {
    super(message);
  }
}

let cachedClient: { key: string; client: ReturnType<typeof twilio> } | null = null;
function clientFor(config: WhatsappConfig) {
  const key = `${config.accountSid}:${config.apiKeySid}`;
  if (!cachedClient || cachedClient.key !== key) {
    cachedClient = { key, client: twilio(config.apiKeySid, config.apiKeySecret, { accountSid: config.accountSid }) };
  }
  return cachedClient.client;
}

export async function sendWhatsappInvite(config: WhatsappConfig, toE164Number: string, details: InviteDetails): Promise<SendResult> {
  const base = { from: config.from, to: `whatsapp:${toE164Number}`, ...(config.statusCallback ? { statusCallback: config.statusCallback } : {}) };
  const params = config.contentSid
    ? { ...base, contentSid: config.contentSid, contentVariables: JSON.stringify(inviteTemplateVariables(details)) }
    : { ...base, body: inviteSandboxText(details) };

  try {
    const message = await clientFor(config).messages.create(params);
    return { sid: message.sid, status: message.status };
  } catch (err) {
    // Twilio's RestException carries a numeric code and a message; neither includes the message body.
    const code = err && typeof err === 'object' && 'code' in err && err.code != null ? String((err as { code: unknown }).code) : null;
    const message = err instanceof Error ? err.message : 'Unknown Twilio error';
    throw new TwilioSendError(message, code);
  }
}
