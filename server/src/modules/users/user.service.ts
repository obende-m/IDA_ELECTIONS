import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword } from '../../lib/password';
import { writeAuditLog } from '../../lib/audit';
import type { Actor } from '../../lib/actor';
import type { CreateUserInput } from './user.validation';

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createUser(input: CreateUserInput, actor: Actor, req?: import('express').Request) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, fullName: input.fullName, role: input.role, passwordHash },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  });

  await writeAuditLog({
    action: 'ADMIN_USER_CREATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'USER',
    targetId: user.id,
    metadata: { email: user.email, role: user.role },
    req,
  });

  return user;
}

/**
 * A Super Admin can't deactivate their own account (self-lockout), and the system refuses to
 * deactivate the last remaining active Super Admin — the platform must always retain at least one
 * account able to unlock a locked election (see prisma/seed.ts's own comment on this invariant).
 */
export async function setUserActive(userId: string, isActive: boolean, actor: Actor, req?: import('express').Request) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Account not found', 404);

  if (!isActive) {
    if (userId === actor.id) {
      throw new AppError('You cannot deactivate your own account.', 409);
    }
    if (user.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } });
      if (activeSuperAdmins <= 1) {
        throw new AppError('Cannot deactivate the last active Super Admin account.', 409);
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  });

  await writeAuditLog({
    action: isActive ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_DEACTIVATED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'USER',
    targetId: userId,
    req,
  });

  return updated;
}

/** Also invalidates all existing sessions for the account, mirroring auth.service.ts's own resetPassword — forces re-login with the new password. */
export async function resetUserPassword(userId: string, newPassword: string, actor: Actor, req?: import('express').Request) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Account not found', 404);

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  await writeAuditLog({
    action: 'ADMIN_USER_PASSWORD_RESET',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    targetType: 'USER',
    targetId: userId,
    req,
  });
}
