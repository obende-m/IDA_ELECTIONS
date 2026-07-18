import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { electionsApi } from './electionsApi';

const ELECTION_KEY = 'current-election';

export function useCurrentElection() {
  return useQuery({ queryKey: [ELECTION_KEY], queryFn: electionsApi.getCurrent });
}

function useInvalidateElection() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ELECTION_KEY] });
}

export function useCloseElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.close, onSuccess: invalidate });
}

export function useLockElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.lock, onSuccess: invalidate });
}

export function useUnlockElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.unlock, onSuccess: invalidate });
}
