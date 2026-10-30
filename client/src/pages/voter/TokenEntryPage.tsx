import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon, Spinner } from '../../components/ui';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../lib/apiClient';
import { useSlowHint } from '../../lib/useSlowHint';
import { votingApi } from '../../features/voting/votingApi';
import { useVotingSession } from '../../features/voting/VotingSessionContext';

interface LinkError {
  message: string;
  /** Network failures / 5xx are worth retrying; a 4xx means the link itself is bad. */
  retryable: boolean;
}

/**
 * Entry point for a voter's personal https://domain/vote/{token} link. Resolves the token against
 * the backend (marking it accessed and audit-logging the attempt either way), then hands off to
 * the identity-confirmation step, or shows why the link can't be used.
 *
 * The backend can take 30-60 s to wake from idle, so after ~8 s we tell the voter that's what is
 * happening, and any network/server failure offers a Retry button instead of a dead end.
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
        if (err instanceof ApiError) {
          setError({ message: err.message, retryable: err.retryable });
        } else {
          setError({ message: NETWORK_ERROR_MESSAGE, retryable: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, attempt, setSession, navigate]);

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-margin-mobile py-16 text-center min-h-screen">
      {error ? (
        <div role="alert" className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-on-background flex items-center justify-center mb-6">
            <Icon name={error.retryable ? 'cloud_off' : 'link_off'} filled size={36} className="text-error-container" />
          </div>
          <h1 className="text-headline-lg-mobile sm:text-headline-lg font-headline-lg uppercase mb-3">
            {error.retryable ? 'Connection Problem' : 'Link Unavailable'}
          </h1>
          <p className="text-body-lg text-secondary max-w-sm">{error.message}</p>
          {error.retryable ? (
            <Button variant="gold" size="md" uppercase leftIcon="refresh" className="mt-8 min-h-12" onClick={() => setAttempt((n) => n + 1)}>
              Retry
            </Button>
          ) : (
            <p className="text-body-md text-secondary max-w-sm mt-6">
              If you believe this is an error, please contact the Electoral Committee for assistance.
            </p>
          )}
        </div>
      ) : (
        <div role="status" aria-live="polite" className="flex flex-col items-center">
          <Spinner className="h-10 w-10 mb-6" />
          <p className="text-label-md font-label-md uppercase tracking-widest text-secondary">Verifying your voting link…</p>
          {slow && (
            <p className="mt-6 max-w-sm text-body-md text-secondary">
              Waking up the server, this can take up to a minute. Please keep this page open.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
