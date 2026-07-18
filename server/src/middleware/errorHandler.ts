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

  console.error(`[Error] ${req.method} ${req.path} - Status: ${statusCode} - Message: ${err.message}`);
  if (!err.isOperational) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
};
