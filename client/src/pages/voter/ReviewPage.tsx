import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, useToast } from '../../components/ui';
import { MobileTopBar } from '../../components/voter/MobileTopBar';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { votingApi } from '../../features/voting/votingApi';
import { ApiError } from '../../lib/apiClient';
import { VotingLinkRequiredNotice } from './VotingLinkRequiredNotice';

/** Ported from review_confirm_vote_mobile/code.html; submits the accumulated selections via the atomic vote-cast transaction. */
export function ReviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, ballot, selections, setReferenceNumber, clearSession } = useVotingSession();
  const [submitting, setSubmitting] = useState(false);

  if (!session || !ballot) {
    return <VotingLinkRequiredNotice />;
  }

  const handleCastVote = async () => {
    setSubmitting(true);
    try {
      const result = await votingApi.castVote(session.token, selections);
      setReferenceNumber(result.referenceNumber);
      navigate('/vote/success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Please try again in a moment.';
      toast({ title: 'Could not cast your vote', description: message, variant: 'error' });
      if (err instanceof ApiError && (err.status === 409 || err.status === 423)) {
        clearSession();
        navigate('/vote/closed', { state: { reason: err.message } });
      } else if (err instanceof ApiError && err.status === 410) {
        clearSession();
        navigate('/vote');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <MobileTopBar title="IDA Election Portal" />

      <main className="mt-16 mb-8 px-6 py-8 flex-grow max-w-lg mx-auto w-full flex flex-col items-center">
        <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mb-4">
          <Icon name="shield" filled size={28} className="text-primary" />
        </div>
        <h1 className="text-headline-md font-headline-md text-center mb-2">Review Your Ballot</h1>
        <p className="text-body-md text-secondary text-center mb-6">Please verify your selections before final submission.</p>

        <div className="w-full flex items-center gap-2 bg-surface-container px-4 py-2 border-t-2 border-primary-container mb-6">
          <Icon name="shield" filled size={18} className="text-primary" />
          <span className="text-label-md font-label-md uppercase tracking-widest text-secondary">Secure Session Encrypted</span>
        </div>

        <div className="w-full space-y-0">
          {ballot.positions.map((position) => {
            const chosenIds = selections[position.id] ?? [];
            const chosenNames = position.candidates.filter((c) => chosenIds.includes(c.id)).map((c) => c.name);
            return (
              <div key={position.id} className="w-full border border-on-background flex items-center justify-between p-4 -mt-px first:mt-0">
                <div>
                  <p className="text-label-sm font-label-sm text-secondary uppercase">{position.title}</p>
                  <p className="text-headline-sm font-headline-sm">
                    {chosenNames.length > 0 ? chosenNames.join(', ') : <span className="text-secondary italic">Abstained</span>}
                  </p>
                </div>
                <button
                  className="w-8 h-8 flex items-center justify-center border border-primary-container text-primary"
                  aria-label={`Edit ${position.title} selection`}
                  onClick={() => navigate(`/vote/select/${position.id}`)}
                >
                  <Icon name="edit" size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="w-full mt-6 p-4 border border-dashed border-outline-variant bg-surface-container-low flex gap-3">
          <Icon name="info" className="text-secondary shrink-0" />
          <p className="text-body-md italic text-secondary">
            Once you cast your vote, your choices are recorded permanently and your voting link is invalidated. This action
            cannot be undone.
          </p>
        </div>

        <div className="w-full mt-8 space-y-3">
          <Button variant="gold" size="lg" fullWidth uppercase leftIcon="shield" loading={submitting} onClick={handleCastVote}>
            Cast My Vote
          </Button>
          <Button variant="secondary" size="lg" fullWidth uppercase onClick={() => navigate(-1)}>
            Back to Selection
          </Button>
        </div>

        <p className="text-label-sm font-label-sm text-secondary opacity-60 mt-8">© 2026 Igarra Development Association (IDA)</p>
      </main>
    </>
  );
}
