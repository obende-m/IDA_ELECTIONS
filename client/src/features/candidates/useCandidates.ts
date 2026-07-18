import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidatesApi } from './candidatesApi';
import type { CandidateFormValues } from './types';

const CANDIDATES_KEY = 'candidates';

export function useCandidatesList(positionId?: string) {
  return useQuery({ queryKey: [CANDIDATES_KEY, positionId], queryFn: () => candidatesApi.list(positionId) });
}

function useInvalidateCandidates() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [CANDIDATES_KEY] });
}

export function useCreateCandidate() {
  const invalidate = useInvalidateCandidates();
  return useMutation({ mutationFn: (data: CandidateFormValues) => candidatesApi.create(data), onSuccess: invalidate });
}

export function useUpdateCandidate() {
  const invalidate = useInvalidateCandidates();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CandidateFormValues> }) => candidatesApi.update(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteCandidate() {
  const invalidate = useInvalidateCandidates();
  return useMutation({ mutationFn: (id: string) => candidatesApi.remove(id), onSuccess: invalidate });
}

export function useUploadCandidatePhoto() {
  const invalidate = useInvalidateCandidates();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => candidatesApi.uploadPhoto(id, file),
    onSuccess: invalidate,
  });
}

export function useRemoveCandidatePhoto() {
  const invalidate = useInvalidateCandidates();
  return useMutation({ mutationFn: (id: string) => candidatesApi.removePhoto(id), onSuccess: invalidate });
}
