import type { Request, Response } from 'express';
import { getCurrentElection } from '../../lib/election';
import { AppError } from '../../middleware/errorHandler';
import { toCsv } from '../../lib/csv';
import { writeAuditLog } from '../../lib/audit';
import * as voterService from './voter.service';
import { importVoters } from './voter.import';
import { actorFromRequest } from '../../lib/actor';
import type { CreateVoterInput, ListVotersQuery, UpdateVoterInput } from './voter.validation';

export async function list(req: Request, res: Response) {
  const election = await getCurrentElection();
  const result = await voterService.listVoters(election.id, req.query as unknown as ListVotersQuery);
  res.json(result);
}

export async function getOne(req: Request, res: Response) {
  const election = await getCurrentElection();
  const voter = await voterService.getVoter(election.id, req.params.id);
  res.json({ voter });
}

export async function create(req: Request, res: Response) {
  const election = await getCurrentElection();
  const voter = await voterService.createVoter(election.id, req.body as CreateVoterInput, actorFromRequest(req), req);
  res.status(201).json({ voter });
}

export async function update(req: Request, res: Response) {
  const election = await getCurrentElection();
  const voter = await voterService.updateVoter(
    election.id,
    req.params.id,
    req.body as UpdateVoterInput,
    actorFromRequest(req),
    req
  );
  res.json({ voter });
}

export async function remove(req: Request, res: Response) {
  const election = await getCurrentElection();
  await voterService.deleteVoter(election.id, req.params.id, actorFromRequest(req), req);
  res.status(204).send();
}

export async function activate(req: Request, res: Response) {
  const election = await getCurrentElection();
  const voter = await voterService.setVoterActive(election.id, req.params.id, true, actorFromRequest(req), req);
  res.json({ voter });
}

export async function deactivate(req: Request, res: Response) {
  const election = await getCurrentElection();
  const voter = await voterService.setVoterActive(election.id, req.params.id, false, actorFromRequest(req), req);
  res.json({ voter });
}

export async function issueToken(req: Request, res: Response) {
  const election = await getCurrentElection();
  const result = await voterService.issueToken(election.id, req.params.id, actorFromRequest(req), req);
  res.status(201).json(result);
}

export async function revokeToken(req: Request, res: Response) {
  const election = await getCurrentElection();
  const token = await voterService.revokeToken(election.id, req.params.id, actorFromRequest(req), req);
  res.json({ token });
}

export async function replaceToken(req: Request, res: Response) {
  const election = await getCurrentElection();
  const result = await voterService.replaceToken(election.id, req.params.id, actorFromRequest(req), req);
  res.status(201).json(result);
}

export async function votingLink(req: Request, res: Response) {
  const election = await getCurrentElection();
  const link = await voterService.getCurrentVotingLink(election.id, req.params.id);
  if (!link) throw new AppError('This voter has no active token', 404);
  res.json({ votingLink: link });
}

export async function importFile(req: Request, res: Response) {
  if (!req.file) throw new AppError('No file was uploaded', 400);
  const election = await getCurrentElection();
  const report = await importVoters(election.id, req.file, actorFromRequest(req), req);
  res.json({ report });
}

export async function resolveToken(req: Request, res: Response) {
  const resolution = await voterService.resolveVotingToken(req.params.token, req);
  res.json(resolution);
}

export async function exportVotersCsv(req: Request, res: Response) {
  const election = await getCurrentElection();
  const voters = await voterService.exportVoters(election.id, req.query as unknown as ListVotersQuery);
  await writeAuditLog({
    action: 'VOTER_LIST_EXPORTED',
    actorId: req.user!.sub,
    actorRole: req.user!.role,
    actorName: req.user!.fullName,
    electionId: election.id,
    metadata: { count: voters.length },
    req,
  });
  const csv = toCsv(voters, [
    { key: 'membershipNumber', header: 'Membership Number' },
    { key: 'fullName', header: 'Full Name' },
    { key: 'email', header: 'Email Address' },
    { key: 'phone', header: 'Phone Number' },
    { key: 'ward', header: 'Ward' },
    { key: 'isActive', header: 'Active' },
    { key: 'votingStatus', header: 'Voting Status' },
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="voters.csv"');
  res.send(csv);
}

export async function exportVotingLinksCsv(req: Request, res: Response) {
  const election = await getCurrentElection();
  const rows = await voterService.listAllVotingLinks(election.id);
  await writeAuditLog({
    action: 'VOTING_LINKS_EXPORTED',
    actorId: req.user!.sub,
    actorRole: req.user!.role,
    actorName: req.user!.fullName,
    electionId: election.id,
    metadata: { count: rows.length },
    req,
  });
  const csv = toCsv(rows, [
    { key: 'membershipNumber', header: 'Membership Number' },
    { key: 'fullName', header: 'Full Name' },
    { key: 'votingStatus', header: 'Voting Status' },
    { key: 'votingLink', header: 'Voting Link' },
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="voting-links.csv"');
  res.send(csv);
}
