import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired session', 401));
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
