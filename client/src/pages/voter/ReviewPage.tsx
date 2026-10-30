import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Modal, useToast } from '../../components/ui';
import { VoterShell } from '../../components/voter/VoterChrome';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { votingApi } from '../../features/voting/votingApi';
import { ApiError } from '../../lib/apiClient';
import { useSlowHint } from '../../lib/useSlowHint';
import { VotingLinkRequiredNotice } from './VotingLinkRequiredNotice';

/**
 * Whole ballot on one page, each contest editable, then an explicit confirmation dialog. Success is only
 * shown after the server acknowledges the ballot (atomic cast transaction returns a reference number).
 */
export function ReviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, ballot, selections, setReferenceNumber, clearSession } = useVotingSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const slow = useSlowHint(submitting, 8000);

  if (!session || !ballot) return <VotingLinkRequiredNotice />;

  const abstained = ballot.positions.filter((p) => (selections[p.id] ?? []).length === 0).length;

  const castVote = async () => {
    setSubmitting(true);
    try {
      const result = await votingApi.castVote(session.token, selections);
      setReferenceNumber(result.referenceNumber);
      navigate('/vote/success', { replace: true });
    } catch (err) {
      const isNetwork = err instanceof ApiError && err.status === 0;
      const message = err instanceof ApiError ? err.message : 'Please try again in a moment.';
      toast({
        title: isNetwork ? 'Connection problem' : 'Your vote was not recorded',
        description: isNetwork ? `${message} Your choices are kept on this device — try again when you're back online. If your vote was already recorded you will be told.` : message,
        variant: 'error',
        durationMs: isNetwork ? 10000 : undefined,
      });
      if (err instanceof ApiError && (err.status === 409 || err.status === 423)) {
        clearSession();
        navigate('/vote/closed', { state: { reason: err.message } });
      } else if (err instanceof ApiError && err.status === 410) {
        clearSession();
        navigate('/vote', { replace: true });
      }
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <VoterShell step="review">
      <div className="animate-rise pb-8">
        <p className="eyebrow mb-3">Step 3 · Review</p>
        <h1 className="font-serif text-headline-xl">Check your ballot</h1>
        <p className="mt-3 text-body-lg text-secondary">Nothing has been submitted yet. Change anything you like, then cast your vote.</p>

        <ol className="mt-8 border-t border-on-background">
          {ballot.positions.map((position, i) => {
            const chosen = position.candidates.filter((c) => (selections[position.id] ?? []).includes(c.id));
            return (
              <li key={position.id} className="grid grid-cols-[2rem_1fr_auto] items-start gap-x-3 gap-y-1 py-5 border-b border-outline-variant">
                <span className="font-mono text-[0.75rem] text-secondary pt-1.5">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <p className="eyebrow">{position.title}</p>
                  {chosen.length > 0 ? (
                    <ul className="mt-1">
                      {chosen.map((c) => (
                        <li key={c.id} className="font-serif text-[1.375rem] leading-snug break-words">
                          {c.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[1.0625rem] italic text-secondary">No choice — abstain</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/vote/select/${position.id}`)}
                  aria-label={`Change ${position.title}`}
                  className="h-10 px-3 rounded-lg text-[0.875rem] font-medium text-primary hover:bg-primary-soft inline-flex items-center gap-1.5"
                >
                  <Icon name="edit" size={15} />
                  Change
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex gap-3 rounded-xl bg-surface-container-low border border-outline-variant p-4">
          <Icon name="info" size={18} className="text-secondary mt-0.5 shrink-0" />
          <p className="text-[0.875rem] text-on-surface-variant">
            When you cast your vote it is recorded permanently and your link stops working. You cannot change your vote afterwards.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
          <Button variant="gold" size="lg" className="sm:flex-1" leftIcon="how_to_vote" onClick={() => setConfirmOpen(true)}>
            Cast my vote
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate(`/vote/select/${ballot.positions[ballot.positions.length - 1].id}`)}>
            Back to ballot
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        title="Cast your vote?"
        description={
          abstained > 0
            ? `You are abstaining on ${abstained} of ${ballot.positions.length} contest${ballot.positions.length > 1 ? 's' : ''}.`
            : `You have made a choice in all ${ballot.positions.length} contests.`
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" disabled={submitting} onClick={() => setConfirmOpen(false)}>
              Keep reviewing
            </Button>
            <Button variant="gold" loading={submitting} onClick={castVote}>
              Yes, cast my vote
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          This is final. Your ballot will be recorded and your voting link will no longer work.
        </p>
        {submitting && slow && (
          <p role="status" className="mt-3 text-[0.875rem] text-secondary">
            The server is waking up — this can take up to a minute. Please don't close or refresh this page.
          </p>
        )}
      </Modal>
    </VoterShell>
  );
}
