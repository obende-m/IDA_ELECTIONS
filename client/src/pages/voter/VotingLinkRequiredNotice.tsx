import { Icon } from '../../components/ui';

/**
 * Shown whenever a voter lands on a step of the ballot flow (verify, select, review) without a
 * resolved personal-link session — e.g. navigating directly instead of following the link the
 * Electoral Committee sent. Voting is intentionally link-only (no manual membership-number/token
 * entry form), so this explains that rather than leaving the voter on a bare error state.
 */
export function VotingLinkRequiredNotice() {
  return (
    <>
      <header className="w-full flex items-center justify-center h-16 bg-surface border-b-2 border-on-background">
        <span className="text-headline-sm font-headline-sm font-bold text-primary">IDA Election Portal</span>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-on-background flex items-center justify-center mb-8">
          <Icon name="link" filled size={44} className="text-primary-container" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-on-background mb-6">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="text-label-md font-label-md uppercase tracking-widest text-secondary">Personal Link Required</span>
        </div>

        <h1 className="text-headline-lg font-headline-lg uppercase mb-3">No Active Voting Session</h1>
        <p className="text-body-lg text-secondary max-w-sm">
          Voting is accessed only through the personal link the Electoral Committee sent to you. Please open that link
          again to continue — this page cannot be reached directly.
        </p>

        <div className="mt-10 p-4 border-l-4 border-primary bg-primary-container/10 max-w-sm text-left">
          <p className="text-label-sm font-label-sm text-primary uppercase mb-1">Can't find your link?</p>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            Contact the Electoral Committee and they can resend it to you.
          </p>
        </div>
      </main>

      <footer className="py-8 px-margin-mobile border-t border-outline-variant text-center">
        <p className="text-label-sm font-label-sm text-secondary opacity-60">
          © 2024 Igarra Development Association (IDA). Secure Electronic Voting System.
        </p>
      </footer>
    </>
  );
}
