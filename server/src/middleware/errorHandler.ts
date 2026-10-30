import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export class AppError extends Error {
  statusCode: number;
  /** Marks this error's message as safe to send to clients (as opposed to internal exceptions). */
  isOperational = true;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Voting links carry a secret token in the URL path (/ballot/:token, /cast/:token, /token/:token/resolve).
 * Anyone who can read the logs must not be able to vote as someone else, so any long opaque path segment
 * is masked before it is written. UUIDs are kept: they are record ids, not secrets.
 */
export function redactPath(path: string): string {
  return path
    .split('/')
    .map((seg) => (seg.length >= 20 && /^[A-Za-z0-9_-]+$/.test(seg) && !UUID.test(seg) ? ':redacted' : seg))
    .join('/');
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const isMulterError = err instanceof MulterError;
  const statusCode = err.statusCode || (isMulterError ? 400 : 500);
  // Only AppError (and known-safe library errors like Multer's) messages are client-safe;
  // anything else (DB/library exceptions) could leak internals, so it's replaced with a generic message.
  const message = err.isOperational || isMulterError ? err.message : 'Internal Server Error';

  console.error(`[Error] ${req.method} ${redactPath(req.path)} - Status: ${statusCode} - Message: ${err.message}`);
  if (!err.isOperational) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
};
