import type { Request, Response } from 'express';
import { actorFromRequest } from '../../lib/actor';
import * as userService from './user.service';
import type { CreateUserInput, ResetUserPasswordInput } from './user.validation';

export async function list(_req: Request, res: Response) {
  const users = await userService.listUsers();
  res.json({ users });
}

export async function create(req: Request, res: Response) {
  const user = await userService.createUser(req.body as CreateUserInput, actorFromRequest(req), req);
  res.status(201).json({ user });
}

export async function activate(req: Request, res: Response) {
  const user = await userService.setUserActive(req.params.id, true, actorFromRequest(req), req);
  res.json({ user });
}

export async function deactivate(req: Request, res: Response) {
  const user = await userService.setUserActive(req.params.id, false, actorFromRequest(req), req);
  res.json({ user });
}

export async function resetPassword(req: Request, res: Response) {
  const { password } = req.body as ResetUserPasswordInput;
  await userService.resetUserPassword(req.params.id, password, actorFromRequest(req), req);
  res.status(204).send();
}
