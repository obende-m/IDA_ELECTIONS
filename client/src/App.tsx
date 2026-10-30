import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { VotingSessionProvider } from './features/voting/VotingSessionContext';
import { ToastProvider } from './components/ui';
import { router } from './router';

// Note: the react-query provider lives in AdminLayout (the only place that uses it), which keeps
// react-query out of the voter bundle.
function App() {
  return (
    <AuthProvider>
      <VotingSessionProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </VotingSessionProvider>
    </AuthProvider>
  );
}

export default App;
