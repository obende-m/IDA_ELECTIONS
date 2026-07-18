import type { Request, Response } from 'express';
import { getCurrentElection } from '../../lib/election';
import { actorFromRequest } from '../../lib/actor';
import * as candidateService from './candidate.service';
import type { CreateCandidateInput, UpdateCandidateInput } from './candidate.validation';

export async function list(req: Request, res: Response) {
  const election = await getCurrentElection();
  const positionId = typeof req.query.positionId === 'string' ? req.query.positionId : undefined;
  const candidates = await candidateService.listCandidates(election.id, { positionId });
  res.json({ candidates });
}

export async function create(req: Request, res: Response) {
  const election = await getCurrentElection();
  const candidate = await candidateService.createCandidate(election.id, req.body as CreateCandidateInput, actorFromRequest(req), req);
  res.status(201).json({ candidate });
}

export async function update(req: Request, res: Response) {
  const election = await getCurrentElection();
  const candidate = await candidateService.updateCandidate(
    election.id,
    req.params.id,
    req.body as UpdateCandidateInput,
    actorFromRequest(req),
    req
  );
  res.json({ candidate });
}

export async function remove(req: Request, res: Response) {
  const election = await getCurrentElection();
  await candidateService.deleteCandidate(election.id, req.params.id, actorFromRequest(req), req);
  res.status(204).send();
}
