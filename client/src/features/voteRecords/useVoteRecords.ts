import { useQuery } from '@tanstack/react-query';
import { voteRecordsApi } from './voteRecordsApi';
import type { VoteRecordsQuery } from './types';

export function useVoteRecords(query: VoteRecordsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vote-records', query],
    queryFn: () => voteRecordsApi.list(query),
    placeholderData: (previous) => previous,
    enabled: options?.enabled ?? true,
  });
}
