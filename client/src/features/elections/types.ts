export type ElectionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export interface Election {
  id: string;
  title: string;
  year: number;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  status: ElectionStatus;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: { id: string; fullName: string } | null;
  unlockedAt: string | null;
  unlockedBy: { id: string; fullName: string } | null;
  _count?: { positions: number; voters: number };
}

export interface ElectionFormValues {
  title: string;
  year: number;
  description?: string;
  startTime?: string;
  endTime?: string;
}
