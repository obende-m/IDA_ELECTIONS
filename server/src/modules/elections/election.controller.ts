import type { Request, Response } from 'express';
import * as electionService from './election.service';
import type { Actor } from './election.service';
import type { LockReasonInput, UnlockReasonInput } from './election.validation';

function actorFromRequest(req: Request): Actor {
  return { id: req.user!.sub, fullName: req.user!.fullName, role: req.user!.role };
}

export async function getCurrent(req: Request, res: Response) {
  const election = await electionService.getCurrentElectionDetail();
  res.json({ election });
}

export async function close(req: Request, res: Response) {
  const election = await electionService.closeElection(actorFromRequest(req), req);
  res.json({ election });
}

export async function lock(req: Request, res: Response) {
  const { reason } = req.body as LockReasonInput;
  const election = await electionService.lockElection(actorFromRequest(req), reason, req);
  res.json({ election });
}

export async function unlock(req: Request, res: Response) {
  const { reason } = req.body as UnlockReasonInput;
  const election = await electionService.unlockElection(actorFromRequest(req), reason, req);
  res.json({ election });
}
