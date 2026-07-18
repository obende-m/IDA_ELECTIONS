import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { writeAuditLog } from '../../lib/audit';
import { AppError } from '../../middleware/errorHandler';
import type { ForgotPasswordInput, LoginInput, ResetPasswordInput } from './auth.validation';

const REFRESH_COOKIE_NAME = 'ida_refresh_token';
const isProduction = process.env.NODE_ENV === 'production';

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    expires: expiresAt,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;

  try {
    const session = await authService.login(email, password);
    setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    await writeAuditLog({
      action: 'ADMIN_LOGIN',
      actorId: session.user.id,
      actorRole: session.user.role,
      actorName: session.user.fullName,
      req,
    });
    res.json({ accessToken: session.accessToken, user: session.user });
  } catch (err) {
    await writeAuditLog({ action: 'ADMIN_LOGIN_FAILED', actorName: email, metadata: { email }, req });
    throw err;
  }
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw new AppError('No active session', 401);

  const session = await authService.refresh(token);
  setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
  res.json({ accessToken: session.accessToken, user: session.user });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const identity = await authService.logout(token);
  clearRefreshCookie(res);
  if (identity) {
    await writeAuditLog({ action: 'ADMIN_LOGOUT', actorId: identity.userId, actorRole: identity.role, req });
  }
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as ForgotPasswordInput;
  const rawToken = await authService.requestPasswordReset(email);

  if (rawToken) {
    await writeAuditLog({ action: 'ADMIN_PASSWORD_RESET_REQUESTED', actorName: email, metadata: { email }, req });
    // Delivery (email/SMS) is an integration detail for a later module; for now the token is
    // returned only in non-production so the reset flow is testable end-to-end without it.
  }

  const devToken = !isProduction && rawToken ? { devToken: rawToken } : {};
  res.json({ message: 'If an account exists for that email, a reset link has been sent.', ...devToken });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body as ResetPasswordInput;
  await authService.resetPassword(token, password);
  await writeAuditLog({ action: 'ADMIN_PASSWORD_RESET_COMPLETED', req });
  res.status(204).send();
}
