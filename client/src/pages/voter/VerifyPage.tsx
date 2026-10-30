import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, useToast } from '../../components/ui';
import { MobileTopBar } from '../../components/voter/MobileTopBar';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { votingApi } from '../../features/voting/votingApi';
import { ApiError } from '../../lib/apiClient';
import { useSlowHint } from '../../lib/useSlowHint';
import { VotingLinkRequiredNotice } from './VotingLinkRequiredNotice';

/**
 * Identity confirmation for a voter who arrived via their personal /vote/:token link (see
 * TokenEntryPage). The link itself is the credential. This screen just gives the voter a
 * moment to confirm it's really them before proceeding, rather than asking them to type anything.
 */
export function VerifyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, ballot, setBallot, clearSession } = useVotingSession();
  const [loading, setLoading] = useState(false);
  const slow = useSlowHint(loading, 8000);

  if (!session) {
    return <VotingLinkRequiredNotice />;
  }

  // The ballot (and so the election year) isn't fetched until the voter confirms; use it only if already known.
  const year = ballot?.election.year;

  return (
    <>
      <MobileTopBar title="Identity Verification" centerTitle showBack={false} rightSlot={<span />} />

      <main className="flex-grow pt-24 pb-12 px-4 sm:px-margin-mobile flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="inline-flex w-24 h-24 items-center justify-center p-4 rounded-2xl bg-on-background shadow-sm mb-6">
            <Icon name="shield" filled size={40} className="text-primary-container" />
          </div>
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-on-surface mb-2">IDA ELECTION PORTAL</h1>
          <p className="text-body-md text-on-surface-variant">{year ? `${year} ` : ''}General Assembly Voting</p>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="bg-primary-container/10 p-4 rounded-r-lg border-l-4 border-primary">
            <p className="text-label-sm font-label-sm text-primary uppercase mb-1">Confirm Your Identity</p>
            <p className="text-body-md text-on-surface-variant leading-tight">
              This voting link was issued to the member below. Please confirm this is you before continuing.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant shadow-sm p-6 space-y-4">
            <div>
              <p className="text-label-sm font-label-sm text-secondary uppercase">Full Name</p>
              <p className="text-headline-sm font-headline-sm break-words">{session.fullName}</p>
            </div>
            <div className="border-t border-outline-variant pt-4">
              <p className="text-label-sm font-label-sm text-secondary uppercase">Membership Number</p>
              <p className="text-headline-sm font-headline-sm break-words">{session.membershipNumber}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="gold"
              size="lg"
              fullWidth
              uppercase
              className="min-h-14"
              rightIcon="verified_user"
              loading={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const fetched = await votingApi.getBallot(session.token);
                  if (fetched.positions.length === 0) {
                    toast({ title: 'Ballot not ready', description: 'The electoral committee has not published any positions yet.', variant: 'error' });
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
              }}
            >
              Yes, This Is Me — Continue
            </Button>
            {loading && slow && (
              <p role="status" className="text-center text-body-md text-secondary">
                Waking up the server, this can take up to a minute. Please keep this page open.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={clearSession}
            className="w-full min-h-11 text-center text-label-md font-label-md text-secondary hover:text-error transition-colors"
          >
            This isn't me
          </button>
        </div>

        <div className="mt-auto pt-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icon name="security" filled size={20} className="text-primary" />
            <span className="text-label-sm font-label-sm text-on-surface tracking-widest uppercase">Secure connection (HTTPS)</span>
          </div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-tighter">
            © {new Date().getFullYear()} Igarra Development Association (IDA). Official Electoral Commission.
          </p>
        </div>
      </main>
    </>
  );
}
