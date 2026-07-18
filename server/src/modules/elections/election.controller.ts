import type { Request, Response } from 'express';
import * as electionService from './election.service';
import { actorFromRequest } from '../../lib/actor';
import type { LockReasonInput, UnlockReasonInput, UpdateElectionInput } from './election.validation';

export async function getCurrent(req: Request, res: Response) {
  const election = await electionService.getCurrentElectionDetail();
  res.json({ election });
}

export async function update(req: Request, res: Response) {
  const election = await electionService.updateCurrentElection(req.body as UpdateElectionInput, actorFromRequest(req), req);
  res.json({ election });
}

export async function open(req: Request, res: Response) {
  const election = await electionService.openElection(actorFromRequest(req), req);
  res.json({ election });
}

export async function pause(req: Request, res: Response) {
  const election = await electionService.pauseElection(actorFromRequest(req), req);
  res.json({ election });
}

export async function resume(req: Request, res: Response) {
  const election = await electionService.resumeElection(actorFromRequest(req), req);
  res.json({ election });
}

export async function archive(req: Request, res: Response) {
  const election = await electionService.archiveElection(actorFromRequest(req), req);
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
