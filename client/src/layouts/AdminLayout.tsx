import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ElectionStatusBadge, Icon } from '../components/ui';
import { Brand } from '../components/Brand';
import { cn } from '../lib/cn';
import { useAuth } from '../features/auth/AuthContext';
import { queryClient } from '../lib/queryClient';
import { useCurrentElection } from '../features/elections/useElection';
import { BackToTopButton } from '../components/BackToTopButton';
import type { UserRole } from '../features/auth/types';

const COMMITTEE: UserRole[] = ['SUPER_ADMIN', 'ELECTION_COMMITTEE'];
const SUPER: UserRole[] = ['SUPER_ADMIN'];

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: UserRole[];
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Election',
    items: [
      { to: '/admin/dashboard', label: 'Overview', icon: 'dashboard' },
      { to: '/admin/results', label: 'Results', icon: 'analytics' },
      // Individual vote records are restricted to Committee/Super Admin; the server is the real boundary.
      { to: '/admin/vote-records', label: 'Vote records', icon: 'visibility', roles: COMMITTEE },
    ],
  },
  {
    title: 'Ballot',
    items: [
      { to: '/admin/positions', label: 'Positions', icon: 'list_alt' },
      { to: '/admin/candidates', label: 'Candidates', icon: 'groups' },
    ],
  },
  { title: 'Electorate', items: [{ to: '/admin/voters', label: 'Voters', icon: 'person_search' }] },
  {
    title: 'Oversight',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: 'description' },
      { to: '/admin/audit', label: 'Audit trail', icon: 'security' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin/users', label: 'Admin accounts', icon: 'manage_accounts', roles: SUPER },
      { to: '/admin/settings', label: 'Election settings', icon: 'settings' },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ELECTION_COMMITTEE: 'Election Committee',
  ADMIN: 'Administrator',
};

function initials(name?: string) {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function formatWindow(start?: string | null, end?: string | null) {
  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (end) return `Closes ${fmt(end)}`;
  if (start) return `Opens ${fmt(start)}`;
  return 'No schedule set';
}

function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [location.pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || (user && i.roles.includes(user.role))) })).filter(
    (g) => g.items.length > 0
  );
  const current = NAV_GROUPS.flatMap((g) => g.items).find((i) => location.pathname.startsWith(i.to));

  return (
    <div className="min-h-screen bg-background text-on-background overflow-x-clip">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-on-background focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Mobile scrim */}
      <div
        className={cn('lg:hidden fixed inset-0 z-40 bg-[#15181a]/40 transition-opacity duration-200', navOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="admin-sidebar"
        aria-label="Admin navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[17rem] bg-surface-bright border-r border-outline-variant flex flex-col',
          'transition-transform duration-300 ease-[var(--ease-out-quart)] lg:translate-x-0',
          navOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full max-lg:invisible'
        )}
      >
        <div className="h-[4.5rem] px-5 flex items-center justify-between border-b border-outline-variant">
          <Link to="/admin/dashboard" className="rounded-lg">
            <Brand subtitle="Admin" />
          </Link>
          <button
            type="button"
            className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-surface-container-low"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        {election && (
          <Link
            to="/admin/settings"
            className="mx-4 mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 hover:border-outline transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow">{election.year}</span>
              <ElectionStatusBadge status={election.status} locked={election.isLocked} />
            </div>
            <p className="mt-2 font-serif text-[1.05rem] leading-snug line-clamp-2">{election.title}</p>
            <p className="mt-1 text-[0.75rem] text-secondary tabular">{formatWindow(election.startTime, election.endTime)}</p>
          </Link>
        )}

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 eyebrow !text-[0.625rem] !text-outline">{group.title}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 h-10 px-3 rounded-lg text-[0.875rem] transition-colors',
                          isActive ? 'bg-on-background text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-background'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon name={item.icon} size={18} className={isActive ? 'text-primary-fixed-dim' : 'text-secondary group-hover:text-on-background'} />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-outline-variant">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-[0.8125rem] font-semibold shrink-0">
              {initials(user?.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.875rem] font-medium truncate">{user?.fullName}</p>
              <p className="text-[0.75rem] text-secondary truncate">{user ? ROLE_LABEL[user.role] ?? user.role : ''}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-error hover:bg-error-container/50 transition-colors"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[17rem] min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 h-[4.5rem] bg-background/85 backdrop-blur-md border-b border-outline-variant">
          <div className="h-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden shrink-0 w-10 h-10 -ml-1 rounded-lg flex items-center justify-center hover:bg-surface-container-low"
                aria-label="Open navigation"
                aria-expanded={navOpen}
                aria-controls="admin-sidebar"
                onClick={() => setNavOpen(true)}
              >
                <Icon name="menu" />
              </button>
              <nav aria-label="Breadcrumb" className="min-w-0">
                <ol className="flex items-center gap-2 text-[0.875rem]">
                  <li className="hidden sm:block text-secondary">Admin</li>
                  <li className="hidden sm:block text-outline" aria-hidden="true">
                    /
                  </li>
                  <li className="font-medium truncate" aria-current="page">
                    {current?.label ?? 'Admin'}
                  </li>
                </ol>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-outline-variant text-[0.75rem] text-secondary">
                <Icon name="lock" size={13} />
                Secure session
              </span>
              <Link
                to="/vote"
                target="_blank"
                rel="noopener"
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[0.8125rem] font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-background"
              >
                Voter portal
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} className="flex-1 w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-8 focus:outline-none">
          <Outlet />
        </main>

        <footer className="border-t border-outline-variant">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row justify-between gap-2 text-[0.75rem] text-secondary">
            <p>© {new Date().getFullYear()} Igarra Development Association. Electoral Committee portal.</p>
            <p className="font-mono uppercase tracking-[0.1em]">All administrative actions are audit-logged</p>
          </div>
        </footer>
      </div>
      <ScrollRestoration />
      <BackToTopButton />
    </div>
  );
}

export function AdminLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminShell />
    </QueryClientProvider>
  );
}
