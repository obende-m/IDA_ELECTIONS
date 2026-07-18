import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analyticsApi';

const ANALYTICS_KEY = 'election-analytics';

/** Single source of truth for Dashboard/Results stats — both pages call this same hook and just render different slices of the response. */
export function useAnalytics() {
  return useQuery({
    queryKey: [ANALYTICS_KEY],
    queryFn: analyticsApi.get,
    refetchInterval: 10_000,
  });
}
