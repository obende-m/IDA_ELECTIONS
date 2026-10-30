import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    return next(new AppError('Invalid or expired session', 401));
  }

  try {
    // The JWT is only a 15-minute bearer of identity; the account's *current* state is authoritative,
    // so a deactivated admin or a changed role takes effect on the very next request.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, role: true, fullName: true },
    });
    if (!user || !user.isActive || user.role === 'VOTER') {
      return next(new AppError('Invalid or expired session', 401));
    }
    req.user = { sub: payload.sub, role: user.role as AccessTokenPayload['role'], fullName: user.fullName };
    next();
  } catch (err) {
    next(err);
  }
}

// SUPER_ADMIN > ELECTION_COMMITTEE > ADMIN: each role can do everything the ones below it can.
// ELECTION_COMMITTEE sits above ordinary ADMIN specifically so routine admin accounts (voter
// imports, candidate data entry) are never automatically able to view individual vote records.
const ROLE_HIERARCHY: Record<AccessTokenPayload['role'], AccessTokenPayload['role'][]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'ELECTION_COMMITTEE', 'ADMIN'],
  ELECTION_COMMITTEE: ['ELECTION_COMMITTEE', 'ADMIN'],
  ADMIN: ['ADMIN'],
};

export function requireRole(...roles: AccessTokenPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const granted = ROLE_HIERARCHY[req.user.role] ?? [req.user.role];
    if (!roles.some((role) => granted.includes(role))) return next(new AppError('Insufficient permissions', 403));
    next();
  };
}
