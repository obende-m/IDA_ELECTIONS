import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { VoterLayout } from './layouts/VoterLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { CandidatesPage } from './pages/admin/CandidatesPage';
import { PositionsPage } from './pages/admin/PositionsPage';
import { VotersPage } from './pages/admin/VotersPage';
import { ResultsPage } from './pages/admin/ResultsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { AuditPage } from './pages/admin/AuditPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { WelcomePage } from './pages/voter/WelcomePage';
import { TokenEntryPage } from './pages/voter/TokenEntryPage';
import { VerifyPage } from './pages/voter/VerifyPage';
import { SelectCandidatePage } from './pages/voter/SelectCandidatePage';
import { ReviewPage } from './pages/voter/ReviewPage';
import { SuccessPage } from './pages/voter/SuccessPage';
import { ClosedPage } from './pages/voter/ClosedPage';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/vote" replace /> },
  { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
  { path: '/admin/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/dashboard', element: <DashboardPage /> },
          { path: '/admin/candidates', element: <CandidatesPage /> },
          { path: '/admin/positions', element: <PositionsPage /> },
          { path: '/admin/voters', element: <VotersPage /> },
          { path: '/admin/results', element: <ResultsPage /> },
          { path: '/admin/reports', element: <ReportsPage /> },
          { path: '/admin/audit', element: <AuditPage /> },
          { path: '/admin/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    element: <VoterLayout />,
    children: [
      { path: '/vote', element: <WelcomePage /> },
      { path: '/vote/verify', element: <VerifyPage /> },
      { path: '/vote/select/:positionId', element: <SelectCandidatePage /> },
      { path: '/vote/review', element: <ReviewPage /> },
      { path: '/vote/success', element: <SuccessPage /> },
      { path: '/vote/closed', element: <ClosedPage /> },
      { path: '/vote/:token', element: <TokenEntryPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
