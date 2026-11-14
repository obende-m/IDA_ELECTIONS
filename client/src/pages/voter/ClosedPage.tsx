import { useLocation } from 'react-router-dom';
import { StatusScreen } from '../../components/voter/VoterChrome';

interface ClosedPageState {
  reason?: string;
}

/** Landing spot whenever the server refuses a ballot because the election isn't open or is locked. */
export function ClosedPage() {
  const location = useLocation();
  const reason = (location.state as ClosedPageState | null)?.reason;
  // The server words this case "Voting has not opened yet. It opens on …" so the page can say so too.
  const notOpenYet = !!reason?.startsWith('Voting has not opened yet');

  return (
    <StatusScreen
      icon="lock_clock"
      kicker={notOpenYet ? 'Not open yet' : 'Voting unavailable'}
      title={notOpenYet ? "Voting hasn't opened yet" : 'The ballot box is not open right now'}
      aside={
        notOpenYet
          ? { title: 'Keep your link', body: 'Your link stays valid until you vote. Open it again once voting opens.' }
          : { title: 'What happens next', body: 'Results are verified and certified by the Electoral Committee before they are published to members.' }
      }
    >
      {reason ?? 'The polling window for this election is closed. Thank you to everyone who took part.'}
    </StatusScreen>
  );
}
