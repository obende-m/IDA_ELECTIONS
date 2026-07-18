export type ElectionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export interface Election {
  id: string;
  title: string;
  year: number;
  status: ElectionStatus;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: { id: string; fullName: string } | null;
  unlockedAt: string | null;
  unlockedBy: { id: string; fullName: string } | null;
}
