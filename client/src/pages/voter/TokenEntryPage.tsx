import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/ui';
import { ApiError } from '../../lib/apiClient';
import { votingApi } from '../../features/voting/votingApi';
import { useVotingSession } from '../../features/voting/VotingSessionContext';

/**
 * Entry point for a voter's personal https://domain/vote/{token} link. Resolves the token against
 * the backend (marking it accessed and audit-logging the attempt either way), then hands off to
 * the identity-confirmation step — or shows why the link can't be used.
 */
export function TokenEntryPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setSession } = useVotingSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This voting link is incomplete.');
      return;
    }

    votingApi
      .resolveToken(token)
      .then((resolved) => {
        setSession({ token, ...resolved });
        navigate('/vote/verify', { replace: true });
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.');
      });
  }, [token, setSession, navigate]);

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile py-16 text-center min-h-screen">
      {error ? (
        <>
          <div className="w-20 h-20 rounded-full bg-on-background flex items-center justify-center mb-6">
            <Icon name="link_off" filled size={36} className="text-error" />
          </div>
          <h1 className="text-headline-lg font-headline-lg uppercase mb-3">Link Unavailable</h1>
          <p className="text-body-lg text-secondary max-w-sm">{error}</p>
          <p className="text-body-md text-secondary max-w-sm mt-6">
            If you believe this is an error, please contact the Electoral Committee for assistance.
          </p>
        </>
      ) : (
        <>
          <svg className="h-10 w-10 animate-spin text-primary mb-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-label-md font-label-md uppercase tracking-widest text-secondary">Verifying your voting link…</p>
        </>
      )}
    </main>
  );
}
