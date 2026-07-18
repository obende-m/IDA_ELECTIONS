import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Gates every /admin/* route behind an authenticated ADMIN session. */
export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-label-md font-label-md uppercase tracking-widest text-secondary">Verifying session…</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
