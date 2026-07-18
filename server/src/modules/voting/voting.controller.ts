import type { Request, Response } from 'express';
import { getCurrentElection } from '../../lib/election';
import { actorFromRequest } from '../../lib/actor';
import * as votingService from './voting.service';
import type { CastVoteInput, VoteRecordsQuery } from './voting.validation';

export async function getBallot(req: Request, res: Response) {
  const ballot = await votingService.getBallot(req.params.token, req);
  res.json(ballot);
}

export async function castVote(req: Request, res: Response) {
  const result = await votingService.castVote(req.params.token, req.body as CastVoteInput, req);
  res.status(201).json(result);
}

export async function listVoteRecords(req: Request, res: Response) {
  const election = await getCurrentElection();
  const query = req.query as unknown as VoteRecordsQuery;
  const result = await votingService.listVoteRecords(election.id, query);
  await votingService.logVoteRecordsAccess(election.id, actorFromRequest(req), query, req);
  res.json(result);
}
