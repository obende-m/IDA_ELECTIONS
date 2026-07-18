import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from './errorHandler';

/** Validates and replaces req.body with the parsed result of `schema`. */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(result.error.issues[0]?.message ?? 'Invalid request body', 400));
    }
    req.body = result.data;
    next();
  };
}

/** Validates and replaces req.query with the parsed result of `schema` (coercing types, applying defaults). */
export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new AppError(result.error.issues[0]?.message ?? 'Invalid query parameters', 400));
    }
    req.query = result.data as any;
    next();
  };
}
