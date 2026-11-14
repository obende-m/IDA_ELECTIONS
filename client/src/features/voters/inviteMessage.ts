interface InviteDetails {
  fullName: string;
  votingLink: string;
  electionTitle?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

// Voters are in Nigeria, so times in messages are always Lagos time, whatever the admin's device says.
const TIME_ZONE = 'Africa/Lagos';

function toDate(value?: string | null): Date | null {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** "Friday, 20 November 2026 at 9:00 am", in Lagos time. */
export function formatVotingTime(value?: string | null): string | null {
  const d = toDate(value);
  return d ? d.toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: TIME_ZONE }) : null;
}

/** { day: "20 Nov", time: "09:00" } in Lagos time: compact pieces for SMS. */
function shortParts(value?: string | null): { day: string; time: string } | null {
  const d = toDate(value);
  if (!d) return null;
  return {
    day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TIME_ZONE }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE }),
  };
}

/**
 * Both voting times in as few characters as possible:
 * same day  → "Voting 20 Nov, 09:00-17:00."
 * two days  → "Opens 20 Nov 09:00, closes 21 Nov 17:00."
 */
function shortVotingWindow(startTime?: string | null, endTime?: string | null): string {
  const opens = shortParts(startTime);
  const closes = shortParts(endTime);
  if (opens && closes) {
    return opens.day === closes.day
      ? `Voting ${opens.day}, ${opens.time}-${closes.time}.`
      : `Opens ${opens.day} ${opens.time}, closes ${closes.day} ${closes.time}.`;
  }
  if (opens) return `Opens ${opens.day} ${opens.time}.`;
  if (closes) return `Closes ${closes.day} ${closes.time}.`;
  return '';
}

/** One SMS part holds 160 plain characters. */
export const SMS_ONE_PART = 160;

const DEFAULT_COUNTRY_CODE = (import.meta.env.VITE_DEFAULT_COUNTRY_CODE as string | undefined) || '234';

/**
 * Turns a number as typed in the voter roll (08012345678, +234 801 234 5678, 2348012345678, 8012345678)
 * into the digits-only international form WhatsApp wants. Returns null when it can't be a real number.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (raw.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  } else if (!digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length <= 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

/** wa.me opens WhatsApp (app or web) on a chat with this number and the message already typed in. */
export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

/**
 * sms: opens the phone's own Messages app on this number with the message already typed in.
 * `?&body=` is the form both Android and iPhone read correctly.
 */
export function smsUrl(phone: string | null | undefined, message: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `sms:+${number}?&body=${encodeURIComponent(message)}` : null;
}

/**
 * The ready-to-send message an admin pastes into WhatsApp / SMS / email.
 * The link sits alone on its own line so chat apps make it tappable.
 */
export function buildInviteMessage({ fullName, votingLink, electionTitle, startTime, endTime }: InviteDetails): string {
  const firstName = fullName.trim().split(/\s+/)[0] || 'Member';
  const opens = formatVotingTime(startTime);
  const closes = formatVotingTime(endTime);

  return [
    `Dear ${firstName},`,
    '',
    `You are invited to vote in the ${electionTitle || 'IDA election'}.`,
    '',
    'Below is your personal voting link:',
    '',
    votingLink,
    '',
    'This link is only for you. Please do not share it or forward it to anyone. It works for one vote only.',
    ...(opens || closes ? [''] : []),
    ...(opens ? [`Voting opens: ${opens}.`] : []),
    ...(closes ? [`Voting closes: ${closes}.`] : []),
    '',
    'Thank you.',
    'IDA Electoral Committee',
  ].join('\n');
}

/**
 * The short text for "Open in my SMS": the longest version that still fits in one SMS part (160 characters).
 * Drops the closing time first, then the greeting; the opening time stays as long as it fits.
 */
export function buildShortSmsMessage({ fullName, votingLink, startTime, endTime }: InviteDetails): string {
  // Plain letters only, so the phone doesn't switch to the 70-character Unicode mode.
  const firstName = (fullName.trim().split(/\s+/)[0] || 'Member').normalize('NFKD').replace(/[^\x20-\x7E]/g, '') || 'Member';
  // Opening AND closing times are always included; to stay in one part we shorten the greeting instead.
  const times = shortVotingWindow(startTime, endTime);
  const footer = [times, 'Do not share.'].filter(Boolean).join(' ');

  const full = `Dear ${firstName}, your IDA voting link:\n${votingLink}\n${footer}`;
  const onePart = [
    full,
    `${firstName}, your IDA voting link:\n${votingLink}\n${footer}`,
    `Your IDA voting link:\n${votingLink}\n${footer}`,
  ];
  // Older, longer links can't fit in one part whatever we cut, so send the full wording in two.
  return onePart.find((t) => t.length <= SMS_ONE_PART) ?? full;
}
