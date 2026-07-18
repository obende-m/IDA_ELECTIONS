import type { Request, Response } from 'express';
import { getCurrentElection } from '../../lib/election';
import { actorFromRequest } from '../../lib/actor';
import * as positionService from './position.service';
import type { CreatePositionInput, UpdatePositionInput } from './position.validation';

export async function list(_req: Request, res: Response) {
  const election = await getCurrentElection();
  const positions = await positionService.listPositions(election.id);
  res.json({ positions });
}

export async function create(req: Request, res: Response) {
  const election = await getCurrentElection();
  const position = await positionService.createPosition(election.id, req.body as CreatePositionInput, actorFromRequest(req), req);
  res.status(201).json({ position });
}

export async function update(req: Request, res: Response) {
  const election = await getCurrentElection();
  const position = await positionService.updatePosition(
    election.id,
    req.params.id,
    req.body as UpdatePositionInput,
    actorFromRequest(req),
    req
  );
  res.json({ position });
}

export async function remove(req: Request, res: Response) {
  const election = await getCurrentElection();
  await positionService.deletePosition(election.id, req.params.id, actorFromRequest(req), req);
  res.status(204).send();
}
