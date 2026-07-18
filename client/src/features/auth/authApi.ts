import { apiRequest } from '../../lib/apiClient';
import type { LoginPayload, LoginResponse } from './types';

export const authApi = {
  login: (payload: LoginPayload) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  refresh: () => apiRequest<LoginResponse>('/auth/refresh', { method: 'POST' }),
  forgotPassword: (email: string) => apiRequest<void>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    apiRequest<void>('/auth/reset-password', { method: 'POST', body: { token, password } }),
};
