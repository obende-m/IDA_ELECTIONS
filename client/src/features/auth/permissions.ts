import type { UserRole } from './types';

/** Roles the server allows to open/pause/resume/close/archive/lock an election and edit its details & schedule. */
export function canManageElection(role: UserRole | undefined | null): boolean {
  return role === 'ELECTION_COMMITTEE' || role === 'SUPER_ADMIN';
}
