import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, useToast } from '../../components/ui';
import { VoterShell } from '../../components/voter/VoterChrome';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { VotingLinkRequiredNotice } from './VotingLinkRequiredNotice';

/**
 * Receipt. Only reachable after the server acknowledged the ballot (ReviewPage stores the reference it returned).
 * "Print receipt" prints only the `.print-receipt` block (see index.css @media print).
 */
export function SuccessPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { referenceNumber, ballot, clearSession } = useVotingSession();
  const [generatedAt] = useState(() => new Date());

  if (!referenceNumber) return <VotingLinkRequiredNotice />;

  const election = ballot?.election;
  const electionLabel = election ? (election.title.includes(String(election.year)) ? election.title : `${election.title} ${election.year}`) : 'IDA Election';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referenceNumber);
      toast({ title: 'Reference copied', variant: 'success', durationMs: 2500 });
    } catch {
      toast({ title: 'Could not copy', description: 'Select the reference and copy it manually.', variant: 'error' });
    }
  };

  return (
    <VoterShell step="done">
      <div className="no-print animate-rise">
        <svg viewBox="0 0 56 56" className="check-draw w-14 h-14 text-success" aria-hidden="true">
          <circle cx="28" cy="28" r="27" fill="var(--color-success-soft)" />
          <path d="M17 29l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="eyebrow mt-8 mb-3">Ballot received</p>
        <h1 className="font-serif text-display">Thank you. Your vote is recorded.</h1>
        <p className="mt-4 text-body-lg text-secondary max-w-xl">
          The voting server confirmed your ballot for {electionLabel}. Your link has now been closed and can't be used again.
        </p>
      </div>

      <section aria-label="Voting receipt" className="print-receipt mt-10 rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden animate-rise" style={{ animationDelay: '120ms' }}>
        <div className="hidden print:block p-6 pb-0">
          <p className="eyebrow">Igarra Development Association</p>
          <h2 className="font-serif text-[1.5rem]">Voter receipt — {electionLabel}</h2>
        </div>
        <div className="p-6 sm:p-8">
          <p className="eyebrow">Your reference number</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-mono text-[1.5rem] sm:text-[1.875rem] tracking-[0.04em] text-on-background break-all select-all">{referenceNumber}</p>
            <button
              type="button"
              onClick={copy}
              className="no-print h-9 px-3 rounded-lg border border-outline-variant text-[0.8125rem] font-medium inline-flex items-center gap-1.5 hover:border-outline"
            >
              <Icon name="content_copy" size={14} />
              Copy
            </button>
          </div>
          <p className="mt-4 text-[0.875rem] text-secondary">
            Keep this reference if you need to contact the Electoral Committee about your vote. It does not reveal your choices.
          </p>
        </div>
        <dl className="grid grid-cols-2 border-t border-outline-variant text-[0.875rem]">
          <div className="p-5 sm:px-8">
            <dt className="eyebrow">Recorded</dt>
            <dd className="mt-1 tabular">{generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
          </div>
          <div className="p-5 sm:px-8 border-l border-outline-variant">
            <dt className="eyebrow">Status</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 text-success">
              <Icon name="verified" size={15} /> Confirmed by server
            </dd>
          </div>
        </dl>
      </section>

      <div className="no-print mt-8 flex flex-col sm:flex-row gap-3">
        <Button variant="secondary" size="lg" leftIcon="print" onClick={() => window.print()}>
          Print or save receipt
        </Button>
        <Button
          variant="ink"
          size="lg"
          className="sm:flex-1"
          onClick={() => {
            clearSession();
            navigate('/vote', { replace: true });
          }}
        >
          Finish and close session
        </Button>
      </div>
      <p className="no-print mt-3 text-[0.8125rem] text-secondary">To save a PDF, choose “Save as PDF” in the print dialog.</p>
    </VoterShell>
  );
}
