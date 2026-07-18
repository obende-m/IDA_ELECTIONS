import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { VotingSessionProvider } from './features/voting/VotingSessionContext';
import { ToastProvider } from './components/ui';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VotingSessionProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </VotingSessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
