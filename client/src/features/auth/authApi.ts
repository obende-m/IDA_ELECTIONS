import { apiRequest } from '../../lib/apiClient';
import type { LoginPayload, LoginResponse } from './types';

// Refresh tokens rotate server-side on every use, so two concurrent calls (React StrictMode's
// double effect-invocation in dev, or just two tabs restoring a session at once) must never both
// hit the network — the loser would race the winner's rotation. Single-flight: the second caller
// within the same tick gets the first call's in-flight promise instead of firing its own request.
let inFlightRefresh: Promise<LoginResponse> | null = null;

function refresh(): Promise<LoginResponse> {
  if (!inFlightRefresh) {
    inFlightRefresh = apiRequest<LoginResponse>('/auth/refresh', { method: 'POST' }).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

export const authApi = {
  login: (payload: LoginPayload) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  refresh,
  forgotPassword: (email: string) => apiRequest<void>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    apiRequest<void>('/auth/reset-password', { method: 'POST', body: { token, password } }),
};
