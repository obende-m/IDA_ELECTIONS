import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, useToast } from '../../components/ui';
import { VoterShell } from '../../components/voter/VoterChrome';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { votingApi } from '../../features/voting/votingApi';
import { ApiError } from '../../lib/apiClient';
import { useSlowHint } from '../../lib/useSlowHint';
import { VotingLinkRequiredNotice } from './VotingLinkRequiredNotice';

/** Identity confirmation: the link is the credential; this gives the voter a moment to confirm it's really them. */
export function VerifyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, setBallot, clearSession } = useVotingSession();
  const [loading, setLoading] = useState(false);
  const [notMe, setNotMe] = useState(false);
  const slow = useSlowHint(loading, 8000);

  if (!session) return <VotingLinkRequiredNotice />;

  const continueToBallot = async () => {
    setLoading(true);
    try {
      const fetched = await votingApi.getBallot(session.token);
      if (fetched.positions.length === 0) {
        toast({ title: 'Ballot not ready', description: 'The Electoral Committee has not published any positions yet.', variant: 'error' });
        return;
      }
      setBallot(fetched);
      navigate(`/vote/select/${fetched.positions[0].id}`);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 423)) {
        clearSession();
        navigate('/vote/closed', { state: { reason: err.message } });
        return;
      }
      toast({
        title: err instanceof ApiError && err.status === 0 ? 'Connection problem' : 'Could not load your ballot',
        description: err instanceof ApiError ? err.message : 'Please try again in a moment.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (notMe) {
    return (
      <VoterShell>
        <div className="animate-rise">
          <span className="w-14 h-14 rounded-2xl bg-error-container text-error flex items-center justify-center mb-8">
            <Icon name="report" size={26} />
          </span>
          <h1 className="font-serif text-headline-xl">Don't use this link</h1>
          <p className="mt-4 text-body-lg text-secondary max-w-xl">
            This link belongs to someone else. Please close this page and let the IDA Electoral Committee know, so they can protect that member's vote and send you your own link.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              variant="ink"
              onClick={() => {
                clearSession();
                navigate('/vote', { replace: true });
              }}
            >
              Leave this ballot
            </Button>
            <Button variant="ghost" onClick={() => setNotMe(false)}>
              Go back
            </Button>
          </div>
        </div>
      </VoterShell>
    );
  }

  return (
    <VoterShell step="verify">
      <div className="animate-rise">
        <p className="eyebrow mb-3">Step 1 · Confirm identity</p>
        <h1 className="font-serif text-headline-xl">Is this you?</h1>
        <p className="mt-3 text-body-lg text-secondary">This private voting link was issued to the member below.</p>

        <div className="mt-8 rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div className="p-6 sm:p-8 flex items-center gap-5">
            <span
              className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-serif text-[1.5rem] shrink-0"
              aria-hidden="true"
            >
              {session.fullName
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Member</p>
              <p className="font-serif text-[1.75rem] leading-tight break-words">{session.fullName}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 border-t border-outline-variant">
            <div className="p-5 sm:px-8">
              <dt className="eyebrow">Membership no.</dt>
              <dd className="mt-1 font-mono text-[0.9375rem] break-all">{session.membershipNumber}</dd>
            </div>
            <div className="p-5 sm:px-8 border-l border-outline-variant">
              <dt className="eyebrow">Link status</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-[0.9375rem] text-success">
                <Icon name="check_circle" size={16} /> Valid, unused
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 space-y-3">
          <Button size="lg" fullWidth rightIcon="arrow_forward" loading={loading} onClick={continueToBallot}>
            Yes, this is me — open my ballot
          </Button>
          {loading && slow && (
            <p role="status" className="text-center text-[0.875rem] text-secondary animate-fade">
              The server is waking up — this can take up to a minute. Please keep this page open.
            </p>
          )}
          <Button variant="ghost" size="lg" fullWidth disabled={loading} onClick={() => setNotMe(true)}>
            No, this isn't me
          </Button>
        </div>
      </div>
    </VoterShell>
  );
}
