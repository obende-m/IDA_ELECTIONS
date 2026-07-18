import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';

/**
 * Compensating control for endpoints that rely on an ambient cookie (refresh, logout) once the
 * refresh cookie is deployed as SameSite=None for cross-site hosting (see auth.controller.ts) —
 * SameSite=Strict's own CSRF protection no longer applies once the cookie is sent cross-site, so
 * this checks the request actually came from our own frontend instead.
 *
 * Rejects only when `Origin` is present and doesn't match CLIENT_URL. A real browser always sends
 * `Origin` on a cross-site POST/fetch — CSRF is inherently a browser-carries-the-victim's-cookie
 * attack, so a request with no Origin header at all isn't that attack in the first place, and
 * rejecting it would only break legitimate direct API callers for no security benefit.
 */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const trusted = process.env.CLIENT_URL || 'http://localhost:5173';

  if (origin && origin !== trusted) {
    return next(new AppError('Request origin not permitted.', 403));
  }
  next();
}
