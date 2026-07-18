import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, useToast } from '../../components/ui';
import { MobileTopBar } from '../../components/voter/MobileTopBar';
import { useVotingSession } from '../../features/voting/VotingSessionContext';
import { votingApi } from '../../features/voting/votingApi';
import { ApiError } from '../../lib/apiClient';
import { VotingLinkRequiredNotice } from './VotingLinkRequiredNotice';

/**
 * Identity confirmation for a voter who arrived via their personal /vote/:token link (see
 * TokenEntryPage). The link itself is the credential — this screen just gives the voter a
 * moment to confirm it's really them before proceeding, rather than asking them to type anything.
 */
export function VerifyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, setBallot, clearSession } = useVotingSession();
  const [loading, setLoading] = useState(false);

  if (!session) {
    return <VotingLinkRequiredNotice />;
  }

  return (
    <>
      <MobileTopBar title="Identity Verification" centerTitle showBack={false} rightSlot={<span />} />

      <main className="flex-grow pt-24 pb-12 px-margin-mobile flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="inline-flex w-24 h-24 items-center justify-center p-4 bg-on-background border border-outline-variant mb-6">
            <Icon name="shield" filled size={40} className="text-primary-container" />
          </div>
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-on-surface mb-2">IDA ELECTION PORTAL</h1>
          <p className="text-body-md text-on-surface-variant">2024 General Assembly Voting</p>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="bg-primary-container/10 p-4 border-l-4 border-primary">
            <p className="text-label-sm font-label-sm text-primary uppercase mb-1">Confirm Your Identity</p>
            <p className="text-body-md text-on-surface-variant leading-tight">
              This voting link was issued to the member below. Please confirm this is you before continuing.
            </p>
          </div>

          <div className="border-2 border-on-background p-6 space-y-4">
            <div>
              <p className="text-label-sm font-label-sm text-secondary uppercase">Full Name</p>
              <p className="text-headline-sm font-headline-sm">{session.fullName}</p>
            </div>
            <div className="border-t border-outline-variant pt-4">
              <p className="text-label-sm font-label-sm text-secondary uppercase">Membership Number</p>
              <p className="text-headline-sm font-headline-sm">{session.membershipNumber}</p>
            </div>
          </div>

          <Button
            variant="gold"
            size="lg"
            fullWidth
            uppercase
            rightIcon="verified_user"
            loading={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const ballot = await votingApi.getBallot(session.token);
                if (ballot.positions.length === 0) {
                  toast({ title: 'Ballot not ready', description: 'The electoral committee has not published any positions yet.', variant: 'error' });
                  return;
                }
                setBallot(ballot);
                navigate(`/vote/select/${ballot.positions[0].id}`);
              } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                  clearSession();
                  navigate('/vote/closed', { state: { reason: err.message } });
                  return;
                }
                toast({
                  title: 'Could not load your ballot',
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

          <button
            type="button"
            onClick={clearSession}
            className="w-full text-center text-label-md font-label-md text-secondary hover:text-error transition-colors"
          >
            This isn't me
          </button>
        </div>

        <div className="mt-auto pt-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icon name="security" filled size={20} className="text-primary" />
            <span className="text-label-sm font-label-sm text-on-surface tracking-widest uppercase">AES-256 Encrypted Session</span>
          </div>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter opacity-60">
            © 2024 Igarra Development Association (IDA). Official Electoral Commission.
          </p>
        </div>
      </main>
    </>
  );
}
