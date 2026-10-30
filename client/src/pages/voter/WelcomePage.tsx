import { Link } from 'react-router-dom';
import { Icon, StatusPill } from '../../components/ui';
import { useVotingSession } from '../../features/voting/VotingSessionContext';

/** Ported from welcome_ida_election_portal_mobile/code.html. */
export function WelcomePage() {
  const { ballot } = useVotingSession();
  // The election year is only known once a ballot has been fetched; otherwise stay neutral.
  const year = ballot?.election.year;

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-margin-mobile h-16 bg-surface border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-2">
          <Icon name="how_to_vote" className="text-primary" />
          <p className="text-label-md font-label-md font-bold text-primary">IDA PORTAL</p>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center pt-24 px-4 sm:px-margin-mobile pb-12">
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary-container/10 rounded-full blur-xl" />
            <div className="relative w-40 h-40 rounded-full bg-on-background flex items-center justify-center border-4 border-primary-container">
              <Icon name="how_to_vote" filled size={64} className="text-primary-container" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-label-md font-label-md tracking-widest text-primary uppercase">Igarra Development Association</p>
            <h1 className="text-headline-lg-mobile sm:text-headline-xl font-headline-xl text-on-background leading-tight break-words">
              {year ? `${year} ` : ''}General Election
            </h1>
          </div>

          <div className="bento-card p-6 w-full text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-primary-container" />
            <p className="text-body-lg font-body-lg text-on-surface-variant leading-relaxed">
              Welcome, Fellow Citizen. Your voice is the cornerstone of our community's future. Engage in the democratic
              process with security and confidence.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary-container text-on-primary-container font-bold shadow-sm w-full justify-center">
            <StatusPill label="Voting by personal link" live={false} />
          </div>

          <div className="w-full pt-4">
            <Link
              to="/vote/verify"
              className="w-full min-h-14 py-5 rounded-lg bg-on-background text-on-primary font-bold text-headline-sm uppercase tracking-widest shadow-sm hover:shadow-md hover:bg-primary hover:-translate-y-px transition-all gold-border-focus flex items-center justify-center gap-3"
            >
              Start Voting
              <Icon name="arrow_forward" filled />
            </Link>
            <p className="mt-4 text-label-sm font-label-sm text-secondary">Secure connection (HTTPS)</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bento-card p-4 flex flex-col items-center gap-2">
              <Icon name="verified_user" filled className="text-primary" />
              <span className="text-label-sm font-label-sm text-on-background">Verified ID</span>
            </div>
            <div className="bento-card p-4 flex flex-col items-center gap-2">
              <Icon name="gpp_good" filled className="text-primary" />
              <span className="text-label-sm font-label-sm text-on-background">Secure connection</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 px-4 sm:px-margin-mobile bg-surface-container-lowest border-t border-outline-variant mt-auto">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="space-y-1">
            <p className="text-label-md font-label-md font-bold text-on-surface">Igarra Development Association (IDA)</p>
            <p className="text-body-md font-body-md text-secondary">Institutional Governance & Civic Duty</p>
          </div>
          <p className="text-label-md font-label-md text-secondary max-w-xs">
            Need help or can't find your voting link? Contact the IDA Electoral Committee.
          </p>
          <p className="text-label-sm font-label-sm text-secondary">
            © {new Date().getFullYear()} Igarra Development Association (IDA). Secure Electronic Voting System.
          </p>
        </div>
      </footer>
    </>
  );
}
