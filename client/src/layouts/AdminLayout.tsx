import { useEffect, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui';
import { cn } from '../lib/cn';
import { useAuth } from '../features/auth/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { useCurrentElection } from '../features/elections/useElection';
import { BackToTopButton } from '../components/BackToTopButton';
import type { UserRole } from '../features/auth/types';

const ELECTION_COMMITTEE_ROLES: UserRole[] = ['SUPER_ADMIN', 'ELECTION_COMMITTEE'];
const SUPER_ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN'];

const NAV_ITEMS: { to: string; label: string; icon: string; roles?: UserRole[] }[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/candidates', label: 'Candidates', icon: 'groups' },
  { to: '/admin/positions', label: 'Positions', icon: 'list_alt' },
  { to: '/admin/voters', label: 'Voters', icon: 'person_search' },
  { to: '/admin/results', label: 'Live Results', icon: 'analytics' },
  // Individual vote records are sensitive: restricted to Election Committee / Super Admin, both
  // client-side (hidden from the nav for anyone else) and server-side (the real security boundary).
  { to: '/admin/vote-records', label: 'Vote Records', icon: 'visibility', roles: ELECTION_COMMITTEE_ROLES },
  { to: '/admin/reports', label: 'Reports', icon: 'description' },
  { to: '/admin/audit', label: 'Audit Logs', icon: 'security' },
  // Managing who else has administrative access is Super Admin-exclusive — same boundary as
  // unlocking a locked election, enforced server-side in user.routes.ts.
  { to: '/admin/users', label: 'Admin Accounts', icon: 'manage_accounts', roles: SUPER_ADMIN_ROLES },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
];

/**
 * Fixed sidebar + top app bar shell for every /admin/* route (ported from admin_dashboard_ida_election_portal code.html).
 * Below the lg breakpoint the sidebar becomes an off-canvas drawer opened from a hamburger button.
 */
function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: electionData } = useCurrentElection();
  const electionYear = electionData?.election.year;
  const [navOpen, setNavOpen] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  // Close the drawer after navigating.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-on-background overflow-x-clip">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-on-background focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      {navOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-30 bg-on-background/40" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

      <aside
        id="admin-sidebar"
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-surface-container border-r border-outline-variant flex flex-col pt-8 z-40 transition-transform duration-200',
          'lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full max-lg:invisible'
        )}
      >
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-on-background flex items-center justify-center shadow-sm">
              <Icon name="shield" filled className="text-primary-container" />
            </div>
            <div>
              <p className="text-headline-sm font-headline-sm font-bold text-primary">Admin Portal</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase tracking-widest">
                {electionYear ? `Election ${electionYear}` : 'Election'}
              </p>
            </div>
          </div>
        </div>
        <nav aria-label="Main navigation" className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 min-h-11 rounded-lg transition-all',
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'text-secondary hover:bg-surface-container-high'
                )
              }
            >
              <Icon name={item.icon} />
              <span className="text-label-md font-label-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-6 border-t border-outline-variant">
          <NavLink
            to="/vote"
            className="block w-full text-center bg-primary-container text-on-primary-container font-bold py-3 rounded-lg uppercase tracking-tighter shadow-sm hover:shadow-md hover:brightness-95 transition-all"
          >
            Cast Vote
          </NavLink>
        </div>
      </aside>

      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center gap-3 px-4 sm:px-6 lg:px-margin-desktop h-16 bg-surface border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="lg:hidden shrink-0 w-11 h-11 -ml-2 flex items-center justify-center rounded-lg hover:bg-surface-container-high"
            aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={navOpen}
            aria-controls="admin-sidebar"
            onClick={() => setNavOpen((v) => !v)}
          >
            <Icon name={navOpen ? 'close' : 'menu'} />
          </button>
          <span className="text-headline-sm font-headline-sm font-bold text-primary truncate">IDA Election Portal</span>
          <div className="hidden md:flex items-center gap-2 bg-on-background px-3 py-1 rounded-full text-primary-container">
            <Icon name="verified" filled size={14} />
            <span className="text-label-md font-label-md uppercase tracking-wider">Secure Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 border-r border-outline-variant pr-4">
            <Icon name="account_circle" className="text-secondary" />
            <div className="text-right leading-tight">
              <p className="text-label-md font-label-md font-bold">{user?.fullName}</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase tracking-wide">{user?.role.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="focus-ring-light flex items-center justify-center gap-2 bg-on-background text-on-primary font-label-md text-label-md min-w-11 h-11 px-3 sm:px-6 rounded-lg shadow-sm hover:shadow-md hover:brightness-110 transition-all"
          >
            <Icon name="logout" size={16} />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      <main id="admin-main" tabIndex={-1} className="lg:ml-64 mt-16 flex-1 min-w-0 px-4 sm:px-6 lg:px-margin-desktop py-8 lg:py-12 flex flex-col gap-8 pb-24 focus:outline-none">
        <Outlet />
      </main>
      <ScrollRestoration />
      <BackToTopButton />

      <footer className="lg:ml-64 bg-surface-container-lowest border-t border-outline-variant py-4 px-4 sm:px-6 lg:px-margin-desktop">
        <div className="flex flex-col md:flex-row flex-wrap justify-between items-center gap-x-6 gap-y-3">
          <p className="text-label-sm font-label-sm text-secondary text-center md:text-left">
            © {new Date().getFullYear()} Igarra Development Association (IDA). Secure Electronic Voting System.
          </p>
          <div className="flex items-center gap-1 text-primary">
            <Icon name="lock_person" size={14} />
            <span className="text-label-sm font-label-sm uppercase font-bold tracking-tighter">Secure connection (HTTPS)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Admin shell wrapped in the react-query provider (only the admin area fetches via react-query). */
export function AdminLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminShell />
    </QueryClientProvider>
  );
}
