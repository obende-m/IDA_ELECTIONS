import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spinner } from '../../components/ui';
import { StatusScreen, VoterShell } from '../../components/voter/VoterChrome';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../lib/apiClient';
import { useSlowHint } from '../../lib/useSlowHint';
import { votingApi } from '../../features/voting/votingApi';
import { useVotingSession } from '../../features/voting/VotingSessionContext';

interface LinkError {
  message: string;
  retryable: boolean;
}

/**
 * Entry point for a voter's personal /vote/{token} link: resolves the token (server marks first access and
 * audit-logs the attempt), then hands off to identity confirmation, or explains why the link can't be used.
 * The backend can take up to a minute to wake, so a hint appears after 8 s and failures offer Retry.
 */
export function TokenEntryPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setSession } = useVotingSession();
  const [error, setError] = useState<LinkError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const slow = useSlowHint(!error, 8000);

  useEffect(() => {
    if (!token) {
      setError({ message: 'This voting link is incomplete.', retryable: false });
      return;
    }
    let cancelled = false;
    setError(null);
    votingApi
      .resolveToken(token)
      .then((resolved) => {
        if (cancelled) return;
        setSession({ token, ...resolved });
        navigate('/vote/verify', { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? { message: err.message, retryable: err.retryable } : { message: NETWORK_ERROR_MESSAGE, retryable: true });
      });
    return () => {
      cancelled = true;
    };
  }, [token, attempt, setSession, navigate]);

  if (error) {
    return (
      <StatusScreen
        icon={error.retryable ? 'wifi_off' : 'link_off'}
        tone="error"
        kicker={error.retryable ? 'Connection problem' : 'Link unavailable'}
        title={error.retryable ? "We couldn't reach the voting server" : 'This voting link cannot be used'}
        action={
          error.retryable ? (
            <Button size="lg" leftIcon="refresh" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          ) : undefined
        }
        aside={{ title: 'Need help?', body: 'If you believe this is a mistake, contact the IDA Electoral Committee. They can check your link or issue a new one.' }}
      >
        {error.message}
      </StatusScreen>
    );
  }

  return (
    <VoterShell step="verify">
      <div role="status" aria-live="polite" className="min-h-[50vh] flex flex-col items-center justify-center text-center animate-fade">
        <Spinner className="h-8 w-8" />
        <p className="mt-5 font-serif text-[1.5rem]">Checking your voting link…</p>
        <p className={slow ? 'mt-3 max-w-sm text-body-md text-secondary animate-fade' : 'sr-only'}>
          {slow ? 'The server is waking up — this can take up to a minute. Please keep this page open.' : ''}
        </p>
      </div>
    </VoterShell>
  );
}
