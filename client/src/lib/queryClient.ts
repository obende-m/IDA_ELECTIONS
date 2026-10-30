import { QueryClient } from '@tanstack/react-query';

/** Shared by the admin area only (provided in AdminLayout) so voters never download react-query. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});
