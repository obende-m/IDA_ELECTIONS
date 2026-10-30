import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { useVotingSession } from '../../features/voting/VotingSessionContext';

/**
 * Ported from vote_submitted_successfully_mobile/code.html. The confetti ornament in the
 * mock is dropped per DESIGN.md's "lack of unnecessary ornamentation" principle.
 *
 * "Print Receipt" calls window.print(); the @media print rules in index.css hide everything except
 * the `.print-receipt` block, so the printout (or "Save as PDF") contains only the receipt.
 */
export function SuccessPage() {
  const navigate = useNavigate();
  const { referenceNumber, ballot, clearSession } = useVotingSession();
  const [generatedAt] = useState(() => new Date());

  const election = ballot?.election;
  const electionLabel = election
    ? election.title.includes(String(election.year))
      ? election.title
      : `${election.title} (${election.year})`
    : 'IDA Election';

  return (
    <>
      <header className="no-print w-full flex items-center justify-between gap-3 px-4 sm:px-margin-mobile h-16 bg-surface border-b border-outline-variant shadow-sm">
        <span className="text-headline-sm font-headline-sm font-bold text-primary">IDA Election Portal</span>
        <span className="inline-flex items-center gap-1.5 bg-on-background text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg shadow-sm">
          <Icon name="lock" size={16} />
          Secure connection
        </span>
      </header>

      <main className="flex-grow flex flex-col items-center px-4 sm:px-margin-mobile py-12 text-center">
        <div className="no-print flex flex-col items-center">
          <p className="text-label-md font-label-md tracking-widest text-primary uppercase mt-4">Igarra Development Association</p>
          <h1 className="text-headline-lg font-headline-lg uppercase mt-1">Secure Electronic Voting</h1>

          <div className="w-24 h-24 rounded-full bg-primary-container shadow-sm flex items-center justify-center my-8">
            <Icon name="check" size={48} className="text-on-background" />
          </div>

          <h2 className="text-headline-lg font-headline-lg mb-3">Vote Recorded</h2>
          <p className="text-body-lg text-secondary max-w-sm">Your vote has been successfully recorded.</p>
        </div>

        <section aria-label="Voting receipt" className="print-receipt w-full max-w-sm rounded-xl border border-outline-variant shadow-sm bg-surface-container-low p-6 mt-8">
          <div className="hidden print:block mb-6 text-left">
            <p className="text-label-md font-label-md uppercase tracking-widest text-primary">Igarra Development Association</p>
            <h2 className="text-headline-md font-headline-md">Voter Receipt</h2>
            <p className="text-body-md text-secondary">{electionLabel}</p>
          </div>
          <p className="text-label-sm font-label-sm text-secondary uppercase tracking-widest mb-2">Voter Reference Number</p>
          <p className="text-headline-lg font-headline-lg text-primary break-all">{referenceNumber ?? '—'}</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-primary print:hidden">
            <Icon name="verified" filled size={16} />
            <span className="text-label-sm font-label-sm">Vote recorded</span>
          </div>
          <p className="hidden print:block mt-6 text-left text-label-md font-label-md text-secondary">
            Receipt generated: {generatedAt.toLocaleString()}
          </p>
          <p className="hidden print:block mt-2 text-left text-label-sm font-label-sm text-secondary">
            Keep this reference number if you need to contact the Electoral Committee about your vote. It does not reveal your
            choices.
          </p>
        </section>

        <p className="no-print text-body-md text-secondary max-w-sm mt-8">
          {election ? `Thank you for participating in the ${election.year} election. ` : 'Thank you for participating. '}
          Your contribution ensures the civic stability of our association.
        </p>

        <div className="no-print w-full max-w-sm space-y-3 mt-10">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="min-h-14"
            onClick={() => {
              clearSession();
              navigate('/vote');
            }}
          >
            Logout
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            className="min-h-14"
            leftIcon="print"
            disabled={!referenceNumber}
            onClick={() => window.print()}
          >
            Print Receipt (PDF)
          </Button>
          <p className="text-label-sm font-label-sm text-secondary">
            In the print dialog, choose "Save as PDF" to keep a digital copy.
          </p>
        </div>
      </main>

      <footer className="no-print py-8 px-4 sm:px-margin-mobile border-t border-outline-variant text-center">
        <p className="text-label-md font-label-md font-bold text-on-surface mb-4">IDA Election Portal</p>
        <p className="text-label-sm font-label-sm text-secondary">
          © {new Date().getFullYear()} Igarra Development Association (IDA). Secure Electronic Voting System.
        </p>
      </footer>
    </>
  );
}
