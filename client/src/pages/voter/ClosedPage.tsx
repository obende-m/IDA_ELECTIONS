import { useLocation } from 'react-router-dom';
import { StatusScreen } from '../../components/voter/VoterChrome';

interface ClosedPageState {
  reason?: string;
}

/** Landing spot whenever the server refuses a ballot because the election isn't open or is locked. */
export function ClosedPage() {
  const location = useLocation();
  const reason = (location.state as ClosedPageState | null)?.reason;

  return (
    <StatusScreen
      icon="lock_clock"
      kicker="Voting unavailable"
      title="The ballot box is not open right now"
      aside={{ title: 'What happens next', body: 'Results are verified and certified by the Electoral Committee before they are published to members.' }}
    >
      {reason ?? 'The polling window for this election is closed. Thank you to everyone who took part.'}
    </StatusScreen>
  );
}
