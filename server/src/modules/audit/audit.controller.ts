import type { Request, Response } from 'express';
import { getCurrentElection } from '../../lib/election';
import * as auditService from './audit.service';
import type { AuditLogQuery } from './audit.validation';

export async function list(req: Request, res: Response) {
  const election = await getCurrentElection();
  const result = await auditService.listAuditLog(election.id, req.query as unknown as AuditLogQuery);
  res.json(result);
}

export async function actions(req: Request, res: Response) {
  const election = await getCurrentElection();
  const result = await auditService.listDistinctActions(election.id);
  res.json({ actions: result });
}
