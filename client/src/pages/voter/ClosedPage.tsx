import { useLocation } from 'react-router-dom';
import { Icon } from '../../components/ui';

interface ClosedPageState {
  reason?: string;
}

/**
 * No Stitch mock exists for this state; composed from the same visual language (institutional
 * header, centered status icon, uppercase status pill, institutional footer) as the Welcome and
 * Vote Submitted screens so it reads as part of the same system.
 *
 * Doubles as the landing spot whenever the backend rejects a ballot fetch/cast because the
 * election isn't ACTIVE or is locked (see VerifyPage/ReviewPage) — `location.state.reason` carries
 * that specific message; absent state (e.g. a bookmarked URL) falls back to the default copy below.
 */
export function ClosedPage() {
  const location = useLocation();
  const reason = (location.state as ClosedPageState | null)?.reason;

  return (
    <>
      <header className="w-full flex items-center justify-center h-16 bg-surface border-b border-outline-variant shadow-sm">
        <span className="text-headline-sm font-headline-sm font-bold text-primary">IDA Election Portal</span>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-on-background shadow-sm flex items-center justify-center mb-8">
          <Icon name="lock_clock" filled size={44} className="text-primary-container" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant mb-6">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="text-label-md font-label-md uppercase tracking-widest text-secondary">Election Status: Closed</span>
        </div>

        <h1 className="text-headline-lg font-headline-lg uppercase mb-3">Voting Is Unavailable</h1>
        <p className="text-body-lg text-secondary max-w-sm">
          {reason ??
            'The polling window for the 2026 General Election has closed. Thank you to everyone who participated. Official results will be published by the Electoral Committee once certified.'}
        </p>

        <div className="mt-10 p-4 rounded-r-lg border-l-4 border-primary bg-primary-container/10 max-w-sm text-left">
          <p className="text-label-sm font-label-sm text-primary uppercase mb-1">What happens next</p>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            Results are verified and certified by the Electoral Committee before being made public.
          </p>
        </div>
      </main>

      <footer className="py-8 px-margin-mobile border-t border-outline-variant text-center">
        <p className="text-label-sm font-label-sm text-secondary opacity-60">
          © 2026 Igarra Development Association (IDA). Secure Electronic Voting System.
        </p>
      </footer>
    </>
  );
}
