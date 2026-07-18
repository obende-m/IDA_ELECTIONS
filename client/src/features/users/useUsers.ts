import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './usersApi';
import type { CreateUserValues } from './types';

const USERS_KEY = 'admin-users';

export function useUsersList() {
  return useQuery({ queryKey: [USERS_KEY], queryFn: usersApi.list });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: (data: CreateUserValues) => usersApi.create(data), onSuccess: invalidate });
}

export function useSetUserActive() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? usersApi.activate(id) : usersApi.deactivate(id),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => usersApi.resetPassword(id, password),
  });
}
