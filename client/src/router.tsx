import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { NotFoundPage } from './pages/NotFoundPage';
import { ContentFallback, FullPageFallback } from './components/RouteFallback';
import { RouteError } from './components/RouteError';

/*
 * Route-level code splitting. The whole voter flow is loaded through the single barrel src/pages/voter/index.ts, giving one small
 * chunk so a voter on a phone downloads nothing admin-related, while
 * the admin shell and each admin page load only when an authenticated admin navigates to them.
 */

// Layouts
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const VoterLayout = lazy(() => import('./pages/voter').then((m) => ({ default: m.VoterLayout })));

// Admin
const LoginPage = lazy(() => import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CandidatesPage = lazy(() => import('./pages/admin/CandidatesPage').then((m) => ({ default: m.CandidatesPage })));
const PositionsPage = lazy(() => import('./pages/admin/PositionsPage').then((m) => ({ default: m.PositionsPage })));
const VotersPage = lazy(() => import('./pages/admin/VotersPage').then((m) => ({ default: m.VotersPage })));
const ResultsPage = lazy(() => import('./pages/admin/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AuditPage = lazy(() => import('./pages/admin/AuditPage').then((m) => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const VoteRecordsPage = lazy(() => import('./pages/admin/VoteRecordsPage').then((m) => ({ default: m.VoteRecordsPage })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })));

// Voter
const WelcomePage = lazy(() => import('./pages/voter').then((m) => ({ default: m.WelcomePage })));
const TokenEntryPage = lazy(() => import('./pages/voter').then((m) => ({ default: m.TokenEntryPage })));
const VerifyPage = lazy(() => import('./pages/voter').then((m) => ({ default: m.VerifyPage })));
const SelectCandidatePage = lazy(() => import('./pages/voter').then((m) => ({ default: m.SelectCandidatePage })));
const ReviewPage = lazy(() => import('./pages/voter').then((m) => ({ default: m.ReviewPage })));
const SuccessPage = lazy(() => import('./pages/voter').then((m) => ({ default: m.SuccessPage })));
const ClosedPage = lazy(() => import('./pages/voter').then((m) => ({ default: m.ClosedPage })));

/** Wraps a lazily-loaded layout; the whole screen is the fallback because there is no chrome to keep yet. */
const withLayoutSuspense = (element: ReactElement) => <Suspense fallback={<FullPageFallback />}>{element}</Suspense>;
/** Wraps a lazily-loaded page rendered inside an already-visible layout. */
const withPageSuspense = (element: ReactElement) => <Suspense fallback={<ContentFallback />}>{element}</Suspense>;

export const router = createBrowserRouter([
  {
    // Pathless root route: one error boundary for every route, including failed chunk loads.
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Navigate to="/vote" replace /> },
      { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
      { path: '/admin/login', element: withLayoutSuspense(<LoginPage />) },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: withLayoutSuspense(<AdminLayout />),
            children: [
              { path: '/admin/dashboard', element: withPageSuspense(<DashboardPage />) },
              { path: '/admin/candidates', element: withPageSuspense(<CandidatesPage />) },
              { path: '/admin/positions', element: withPageSuspense(<PositionsPage />) },
              { path: '/admin/voters', element: withPageSuspense(<VotersPage />) },
              { path: '/admin/results', element: withPageSuspense(<ResultsPage />) },
              { path: '/admin/vote-records', element: withPageSuspense(<VoteRecordsPage />) },
              { path: '/admin/users', element: withPageSuspense(<UsersPage />) },
              { path: '/admin/reports', element: withPageSuspense(<ReportsPage />) },
              { path: '/admin/audit', element: withPageSuspense(<AuditPage />) },
              { path: '/admin/settings', element: withPageSuspense(<SettingsPage />) },
            ],
          },
        ],
      },
      {
        element: withLayoutSuspense(<VoterLayout />),
        children: [
          { path: '/vote', element: withPageSuspense(<WelcomePage />) },
          { path: '/vote/verify', element: withPageSuspense(<VerifyPage />) },
          { path: '/vote/select/:positionId', element: withPageSuspense(<SelectCandidatePage />) },
          { path: '/vote/review', element: withPageSuspense(<ReviewPage />) },
          { path: '/vote/success', element: withPageSuspense(<SuccessPage />) },
          { path: '/vote/closed', element: withPageSuspense(<ClosedPage />) },
          { path: '/vote/:token', element: withPageSuspense(<TokenEntryPage />) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
