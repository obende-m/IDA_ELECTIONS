import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signAccessToken } from '../../lib/jwt';
import { generateOpaqueToken, hashToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: { id: string; email: string; fullName: string; role: AdminRole };
}

async function createSession(userId: string): Promise<{ refreshToken: string; expiresAt: Date }> {
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await prisma.session.create({
    data: { userId, token: hashToken(refreshToken), expiresAt },
  });
  return { refreshToken, expiresAt };
}

export async function login(email: string, password: string): Promise<SessionResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.role === 'VOTER') {
    throw new AppError('Invalid email or password', 401);
  }

  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  const role = user.role as AdminRole;
  const { refreshToken, expiresAt } = await createSession(user.id);
  const accessToken = signAccessToken({ sub: user.id, role, fullName: user.fullName });

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    user: { id: user.id, email: user.email, fullName: user.fullName, role },
  };
}

export async function refresh(rawRefreshToken: string): Promise<SessionResult> {
  const tokenHash = hashToken(rawRefreshToken);
  const session = await prisma.session.findUnique({ where: { token: tokenHash }, include: { user: true } });

  if (!session || session.expiresAt < new Date() || !session.user.isActive || session.user.role === 'VOTER') {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  const role = session.user.role as AdminRole;

  // Rotate: invalidate the old session and issue a new one.
  await prisma.session.delete({ where: { id: session.id } });
  const { refreshToken, expiresAt } = await createSession(session.userId);
  const accessToken = signAccessToken({ sub: session.userId, role, fullName: session.user.fullName });

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    user: { id: session.user.id, email: session.user.email, fullName: session.user.fullName, role },
  };
}

/** Deletes the session behind the refresh token, if any, and returns who it belonged to (for the audit log). */
export async function logout(rawRefreshToken: string | undefined): Promise<{ userId: string; role: AdminRole } | null> {
  if (!rawRefreshToken) return null;
  const session = await prisma.session.findUnique({ where: { token: hashToken(rawRefreshToken) }, include: { user: true } });
  if (!session) return null;
  await prisma.session.delete({ where: { id: session.id } });
  return { userId: session.userId, role: session.user.role as AdminRole };
}

/** Always resolves without revealing whether the email exists. Returns the raw token only for the caller to deliver (e.g. email); never logged. */
export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;

  const rawToken = generateOpaqueToken(32);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashToken(rawToken),
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  return rawToken;
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { passwordResetTokenHash: hashToken(rawToken) } });

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw new AppError('This reset link is invalid or has expired.', 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
}
