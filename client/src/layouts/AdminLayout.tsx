import { NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui';
import { cn } from '../lib/cn';
import { useAuth } from '../features/auth/AuthContext';
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

/** Fixed sidebar + top app bar shell for every /admin/* route (ported from admin_dashboard_ida_election_portal code.html). */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-surface-container border-r border-on-background flex flex-col pt-8 z-40">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-on-background flex items-center justify-center">
              <Icon name="shield" filled className="text-primary-container" />
            </div>
            <div>
              <p className="text-headline-sm font-headline-sm font-bold text-primary">Admin Portal</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase tracking-widest">Election 2026</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 transition-colors',
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-primary'
                    : 'text-secondary hover:bg-secondary-container'
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
            className="block w-full text-center bg-primary-container text-on-primary-container font-bold py-3 uppercase tracking-tighter hover:bg-primary transition-colors border border-on-background"
          >
            Cast Vote
          </NavLink>
        </div>
      </aside>

      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop h-16 bg-surface border-b-2 border-on-background">
        <div className="flex items-center gap-4">
          <span className="text-headline-sm font-headline-sm font-bold text-primary">IDA Election Portal</span>
          <div className="hidden md:flex items-center gap-2 bg-on-background px-3 py-1 text-primary-container">
            <Icon name="verified" filled size={14} />
            <span className="text-label-md font-label-md uppercase tracking-wider">Secure Protocol v.4.0</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border-r border-outline-variant pr-4">
            <Icon name="account_circle" className="text-secondary" />
            <div className="text-right leading-tight">
              <p className="text-label-md font-label-md font-bold">{user?.fullName}</p>
              <p className="text-label-sm font-label-sm text-secondary uppercase tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-on-background text-on-primary font-label-md text-label-md px-6 py-2 border-2 border-on-background hover:bg-transparent hover:text-on-background transition-all"
          >
            <Icon name="logout" size={16} />
            Log Out
          </button>
        </div>
      </header>

      <main className="ml-64 mt-16 flex-1 px-margin-desktop py-12 flex flex-col gap-8 pb-24">
        <Outlet />
      </main>
      <ScrollRestoration />
      <BackToTopButton />

      <footer className="ml-64 bg-surface-container-lowest border-t border-outline-variant py-4 px-margin-desktop">
        <div className="flex flex-col md:flex-row flex-wrap justify-between items-center gap-x-6 gap-y-3">
          <p className="text-label-sm font-label-sm text-secondary text-center md:text-left">
            © 2026 Igarra Development Association (IDA). Secure Electronic Voting System.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
            <a className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
              Election Integrity
            </a>
            <a className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
              Support
            </a>
            <div className="flex items-center gap-1 text-primary">
              <Icon name="lock_person" size={14} />
              <span className="text-label-sm font-label-sm uppercase font-bold tracking-tighter">E2E Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
