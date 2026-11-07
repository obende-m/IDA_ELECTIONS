interface InviteDetails {
  fullName: string;
  votingLink: string;
  electionTitle?: string | null;
  endTime?: string | null;
}

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
 * The ready-to-send message an admin pastes into WhatsApp / SMS / email.
 * The link sits alone on its own line so chat apps make it tappable.
 */
export function buildInviteMessage({ fullName, votingLink, electionTitle, endTime }: InviteDetails): string {
  const firstName = fullName.trim().split(/\s+/)[0] || 'Member';
  const deadline = endTime ? new Date(endTime) : null;
  const closes = deadline && !Number.isNaN(deadline.getTime())
    ? deadline.toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short' })
    : null;

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
    ...(closes ? ['', `Voting closes: ${closes}.`] : []),
    '',
    'Thank you.',
    'IDA Electoral Committee',
  ].join('\n');
}
