import { Link } from 'react-router-dom';
import { Icon, StatusPill } from '../../components/ui';

const FOOTER_LINKS = ['Privacy Policy', 'Election Integrity', 'Terms of Service', 'Support'];

/** Ported from welcome_ida_election_portal_mobile/code.html. */
export function WelcomePage() {
  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile h-16 bg-surface border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-2">
          <Icon name="how_to_vote" className="text-primary" />
          <h1 className="text-label-md font-label-md font-bold text-primary">IDA PORTAL</h1>
        </div>
        <div className="flex items-center gap-4">
          <Icon name="notifications" className="text-secondary" />
          <Icon name="account_circle" className="text-secondary" />
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center pt-24 px-margin-mobile pb-12 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary-container/10 rounded-full blur-xl" />
            <div className="relative w-40 h-40 rounded-full bg-on-background flex items-center justify-center border-4 border-primary-container">
              <Icon name="how_to_vote" filled size={64} className="text-primary-container" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-label-md font-label-md tracking-widest text-primary uppercase">Igarra Development Association</p>
            <h2 className="text-headline-xl font-headline-xl text-on-background leading-tight">2026 General Election</h2>
          </div>

          <div className="bento-card p-6 w-full text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-primary-container" />
            <p className="text-body-lg font-body-lg text-on-surface-variant leading-relaxed">
              Welcome, Fellow Citizen. Your voice is the cornerstone of our community's future. Engage in the democratic
              process with security and confidence.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary-container text-on-primary-container font-bold shadow-sm w-full justify-center">
            <StatusPill label="Election Status: Active" />
          </div>

          <div className="w-full pt-4">
            <Link
              to="/vote/verify"
              className="w-full py-5 rounded-lg bg-on-background text-on-primary font-bold text-headline-sm uppercase tracking-widest shadow-sm hover:shadow-md hover:bg-primary hover:-translate-y-px transition-all gold-border-focus flex items-center justify-center gap-3"
            >
              Start Voting
              <Icon name="arrow_forward" filled />
            </Link>
            <p className="mt-4 text-label-sm font-label-sm text-secondary">Secure end-to-end encrypted session</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bento-card p-4 flex flex-col items-center gap-2">
              <Icon name="verified_user" filled className="text-primary" />
              <span className="text-label-sm font-label-sm text-on-background">Verified ID</span>
            </div>
            <div className="bento-card p-4 flex flex-col items-center gap-2">
              <Icon name="gpp_good" filled className="text-primary" />
              <span className="text-label-sm font-label-sm text-on-background">Encrypted</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 px-margin-mobile bg-surface-container-lowest border-t border-outline-variant mt-auto">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="space-y-1">
            <p className="text-label-md font-label-md font-bold text-on-surface">Igarra Development Association (IDA)</p>
            <p className="text-body-md font-body-md text-secondary">Institutional Governance & Civic Duty</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <a key={link} className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors underline" href="#">
                {link}
              </a>
            ))}
          </div>
          <div className="pt-4 space-y-2">
            <p className="text-label-sm font-label-sm text-secondary">Contact IDA Official Secretariat:</p>
            <div className="flex items-center justify-center gap-4 text-primary">
              <Icon name="mail" />
              <Icon name="call" />
              <Icon name="location_on" />
            </div>
          </div>
          <p className="text-label-sm font-label-sm text-secondary opacity-60">
            © 2026 Igarra Development Association (IDA). Secure Electronic Voting System.
          </p>
        </div>
      </footer>
    </>
  );
}
