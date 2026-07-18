import { prisma } from './prisma';
import type { Election } from '@prisma/client';

/**
 * Returns the election that voter/candidate/position management currently operates on, defaulting
 * to the most recently created non-archived election. Full election creation/switching UI lands
 * in the Election Management module; until then this bootstraps a single default election so the
 * rest of the system (which is already fully multi-election-scoped in the schema) has one to use.
 */
export async function getCurrentElection(): Promise<Election> {
  const existing = await prisma.election.findFirst({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return existing;

  return prisma.election.create({
    data: {
      title: process.env.DEFAULT_ELECTION_TITLE ?? 'General Election',
      year: new Date().getFullYear(),
      status: 'DRAFT',
    },
  });
}
