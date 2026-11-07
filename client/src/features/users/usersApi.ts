import { apiRequest } from '../../lib/apiClient';
import type { AdminUser, CreatableAdminRole, CreateUserValues } from './types';

export const usersApi = {
  list: () => apiRequest<{ users: AdminUser[] }>('/users'),
  create: (data: CreateUserValues) => apiRequest<{ user: AdminUser }>('/users', { method: 'POST', body: data }),
  activate: (id: string) => apiRequest<{ user: AdminUser }>(`/users/${id}/activate`, { method: 'POST' }),
  deactivate: (id: string) => apiRequest<{ user: AdminUser }>(`/users/${id}/deactivate`, { method: 'POST' }),
  changeRole: (id: string, role: CreatableAdminRole) =>
    apiRequest<{ user: AdminUser }>(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
  remove: (id: string) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, password: string) =>
    apiRequest<void>(`/users/${id}/reset-password`, { method: 'POST', body: { password } }),
};
