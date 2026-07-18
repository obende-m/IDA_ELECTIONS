import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { electionsApi } from './electionsApi';
import type { ElectionFormValues } from './types';

const ELECTION_KEY = 'current-election';

export function useCurrentElection() {
  return useQuery({ queryKey: [ELECTION_KEY], queryFn: electionsApi.getCurrent });
}

function useInvalidateElection() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ELECTION_KEY] });
}

export function useUpdateElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: (data: Partial<ElectionFormValues>) => electionsApi.update(data), onSuccess: invalidate });
}

export function useOpenElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.open, onSuccess: invalidate });
}

export function usePauseElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.pause, onSuccess: invalidate });
}

export function useResumeElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.resume, onSuccess: invalidate });
}

export function useCloseElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.close, onSuccess: invalidate });
}

export function useArchiveElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.archive, onSuccess: invalidate });
}

export function useLockElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.lock, onSuccess: invalidate });
}

export function useUnlockElection() {
  const invalidate = useInvalidateElection();
  return useMutation({ mutationFn: electionsApi.unlock, onSuccess: invalidate });
}
