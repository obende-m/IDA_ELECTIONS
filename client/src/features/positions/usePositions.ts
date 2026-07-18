import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { positionsApi } from './positionsApi';
import type { PositionFormValues } from './types';

const POSITIONS_KEY = 'positions';

export function usePositionsList() {
  return useQuery({ queryKey: [POSITIONS_KEY], queryFn: positionsApi.list });
}

function useInvalidatePositions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
}

export function useCreatePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({ mutationFn: (data: PositionFormValues) => positionsApi.create(data), onSuccess: invalidate });
}

export function useUpdatePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PositionFormValues> }) => positionsApi.update(id, data),
    onSuccess: invalidate,
  });
}

export function useDeletePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({ mutationFn: (id: string) => positionsApi.remove(id), onSuccess: invalidate });
}
