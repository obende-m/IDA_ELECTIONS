import type { AdminRole } from '../modules/auth/auth.service';
import type { Request } from 'express';

/** The authenticated admin performing a mutation, for audit-log attribution. */
export interface Actor {
  id: string;
  fullName: string;
  role: AdminRole;
}

export function actorFromRequest(req: Request): Actor {
  return { id: req.user!.sub, fullName: req.user!.fullName, role: req.user!.role };
}
