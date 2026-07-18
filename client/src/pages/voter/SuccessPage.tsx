import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { useVotingSession } from '../../features/voting/VotingSessionContext';

const FOOTER_LINKS = ['Privacy Policy', 'Terms of Service', 'Election Integrity', 'Support'];

/**
 * Ported from vote_submitted_successfully_mobile/code.html. The confetti ornament in the
 * mock is dropped per DESIGN.md's "lack of unnecessary ornamentation" principle.
 */
export function SuccessPage() {
  const navigate = useNavigate();
  const { referenceNumber, clearSession } = useVotingSession();

  return (
    <>
      <header className="w-full flex items-center justify-between px-margin-mobile h-16 bg-surface border-b-2 border-on-background">
        <span className="text-headline-sm font-headline-sm font-bold text-primary">IDA Election Portal</span>
        <button className="bg-on-background text-on-primary font-label-md text-label-md px-4 py-2 border-2 border-on-background">
          Secure Session
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center px-margin-mobile py-12 text-center">
        <p className="text-label-md font-label-md tracking-widest text-primary uppercase mt-4">Igarra Development Association</p>
        <h1 className="text-headline-lg font-headline-lg uppercase mt-1">Secure Electronic Voting</h1>

        <div className="w-24 h-24 rounded-full bg-primary-container border-2 border-on-background flex items-center justify-center my-8">
          <Icon name="check" size={48} className="text-on-background" />
        </div>

        <h2 className="text-headline-lg font-headline-lg mb-3">Vote Recorded</h2>
        <p className="text-body-lg text-secondary max-w-sm">
          Your vote has been successfully recorded and encrypted in the IDA secure database.
        </p>

        <div className="w-full max-w-sm border-2 border-on-background bg-surface-container-low p-6 mt-8">
          <p className="text-label-sm font-label-sm text-secondary uppercase tracking-widest mb-2">Voter Reference Number</p>
          <p className="text-headline-lg font-headline-lg text-primary">{referenceNumber ?? '—'}</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-primary">
            <Icon name="verified" filled size={16} />
            <span className="text-label-sm font-label-sm">Transaction Verified</span>
          </div>
        </div>

        <p className="text-body-md text-secondary max-w-sm mt-8">
          Thank you for participating in the 2026 Election cycle. Your contribution ensures the civic stability of our
          association.
        </p>

        <div className="w-full max-w-sm space-y-3 mt-10">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              clearSession();
              navigate('/vote');
            }}
          >
            Logout
          </Button>
          <Button variant="secondary" size="lg" fullWidth leftIcon="print">
            Print Receipt (PDF)
          </Button>
        </div>
      </main>

      <footer className="py-8 px-margin-mobile border-t border-outline-variant text-center">
        <p className="text-label-md font-label-md font-bold text-on-surface mb-4">IDA Election Portal</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
          {FOOTER_LINKS.map((link) => (
            <a key={link} className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
              {link}
            </a>
          ))}
        </div>
        <p className="text-label-sm font-label-sm text-secondary opacity-60">
          © 2026 Igarra Development Association (IDA). Secure Electronic Voting System.
        </p>
      </footer>
    </>
  );
}
