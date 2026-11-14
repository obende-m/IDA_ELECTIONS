import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { votersApi } from './votersApi';
import type { VoterFormValues, VoterListQuery } from './types';

const VOTERS_KEY = 'voters';

export function useVotersList(query: VoterListQuery) {
  return useQuery({
    queryKey: [VOTERS_KEY, query],
    queryFn: () => votersApi.list(query),
    placeholderData: (previous) => previous,
  });
}

function useInvalidateVoters() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [VOTERS_KEY] });
}

export function useCreateVoter() {
  const invalidate = useInvalidateVoters();
  return useMutation({
    mutationFn: (data: VoterFormValues) => votersApi.create(data),
    onSuccess: invalidate,
  });
}

export function useUpdateVoter() {
  const invalidate = useInvalidateVoters();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VoterFormValues> }) => votersApi.update(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteVoter() {
  const invalidate = useInvalidateVoters();
  return useMutation({ mutationFn: (id: string) => votersApi.remove(id), onSuccess: invalidate });
}

export function useSetVoterActive() {
  const invalidate = useInvalidateVoters();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? votersApi.activate(id) : votersApi.deactivate(id),
    onSuccess: invalidate,
  });
}

export function useIssueToken() {
  const invalidate = useInvalidateVoters();
  return useMutation({ mutationFn: (id: string) => votersApi.issueToken(id), onSuccess: invalidate });
}

export function useRevokeToken() {
  const invalidate = useInvalidateVoters();
  return useMutation({ mutationFn: (id: string) => votersApi.revokeToken(id), onSuccess: invalidate });
}

export function useReplaceToken() {
  const invalidate = useInvalidateVoters();
  return useMutation({ mutationFn: (id: string) => votersApi.replaceToken(id), onSuccess: invalidate });
}

export function useImportVoters() {
  const invalidate = useInvalidateVoters();
  return useMutation({ mutationFn: (file: File) => votersApi.import(file), onSuccess: invalidate });
}

/** Which channels the server can send on automatically (Twilio). WhatsApp 'off' / sms false hides that action. */
export function useMessagingStatus() {
  return useQuery({ queryKey: [VOTERS_KEY, 'messaging-status'], queryFn: () => votersApi.messagingStatus(), staleTime: 5 * 60_000 });
}

export function useSendInvite() {
  return useMutation({
    mutationFn: ({ id, channel }: { id: string; channel: 'whatsapp' | 'sms' }) =>
      channel === 'sms' ? votersApi.sendSms(id) : votersApi.sendWhatsapp(id),
  });
}
