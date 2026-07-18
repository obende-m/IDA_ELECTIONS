import type { Request, Response } from 'express';
import { getCurrentElection } from '../../lib/election';
import { actorFromRequest } from '../../lib/actor';
import { writeAuditLog } from '../../lib/audit';
import * as analyticsService from '../analytics/analytics.service';

export async function get(req: Request, res: Response) {
  const election = await getCurrentElection();
  const analytics = await analyticsService.getElectionAnalytics(election.id);
  res.json(analytics);
}

export async function reconcile(req: Request, res: Response) {
  const election = await getCurrentElection();
  const actor = actorFromRequest(req);

  await analyticsService.reconcileTallies(election.id);

  await writeAuditLog({
    action: 'ANALYTICS_RECONCILED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'ELECTION',
    targetId: election.id,
    electionId: election.id,
    req,
  });

  res.status(204).send();
}
