import type { UserRole } from './types';

/** Roles the server allows to open/pause/resume/close/lock an election and edit its details & schedule. */
export function canManageElection(role: UserRole | undefined | null): boolean {
  return role === 'ELECTION_COMMITTEE' || role === 'SUPER_ADMIN';
}

/** Archiving (like unlocking) is Super Admin only on the server. */
export function canArchiveElection(role: UserRole | undefined | null): boolean {
  return role === 'SUPER_ADMIN';
}
