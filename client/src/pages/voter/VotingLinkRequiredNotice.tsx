import { Link } from 'react-router-dom';
import { StatusScreen } from '../../components/voter/VoterChrome';

/**
 * Shown when a voter reaches a ballot step without a resolved personal-link session. Voting is link-only by
 * design (no manual token entry), so this explains how to get back in.
 */
export function VotingLinkRequiredNotice() {
  return (
    <StatusScreen
      icon="link"
      kicker="Personal link required"
      title="Open your voting link to continue"
      action={
        <Link to="/vote" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-outline-variant bg-surface-container-lowest text-[0.875rem] font-medium hover:border-outline">
          How voting works
        </Link>
      }
      aside={{ title: "Can't find your link?", body: 'Contact the IDA Electoral Committee — they can resend it or issue a new one.' }}
    >
      Voting is only available through the private link the Electoral Committee sent you. If you closed this page part-way, open that link again — your choices are kept on this device until you cast your vote.
    </StatusScreen>
  );
}
