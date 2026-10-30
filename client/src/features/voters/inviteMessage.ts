interface InviteDetails {
  fullName: string;
  votingLink: string;
  electionTitle?: string | null;
  endTime?: string | null;
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
