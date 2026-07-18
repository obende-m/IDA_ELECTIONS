import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

/** Handler for a single not-yet-implemented route, for use as a fallback inside a partially-built router. */
export function notImplementedHandler(moduleName: string) {
  return (_req: Request, res: Response) => {
    res.status(501).json({
      status: 'error',
      statusCode: 501,
      message: `This ${moduleName} capability has not been implemented yet.`,
    });
  };
}

/** Placeholder router for a module not yet implemented at all; keeps app.ts wiring intact until the owning module lands. */
export function notImplementedRouter(moduleName: string): Router {
  const router = createRouter();
  router.all('*', notImplementedHandler(moduleName));
  return router;
}
