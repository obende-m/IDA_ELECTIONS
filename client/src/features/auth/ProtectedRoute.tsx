import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../../components/ui';
import { useSlowHint } from '../../lib/useSlowHint';
import { useAuth } from './AuthContext';

/** Gates every /admin/* route behind an authenticated ADMIN session. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const slow = useSlowHint(status === 'loading', 8000);

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Spinner className="h-8 w-8" />
        <p className="text-label-md font-label-md uppercase tracking-widest text-secondary">Verifying session…</p>
        {slow && <p className="text-body-md text-secondary max-w-sm">Waking up the server, this can take up to a minute.</p>}
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
