export interface VoteRecord {
  id: string;
  voterName: string;
  membershipNumber: string;
  position: string;
  candidate: string;
  castAt: string;
  referenceNumber: string;
}

export interface VoteRecordsResult {
  records: VoteRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VoteRecordsQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ReceiptLink {
  status: 'ISSUED' | 'CONSUMED' | 'REVOKED' | string;
  issuedAt: string;
  firstOpenedAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  usedForThisBallot: boolean;
}

/** Result of checking a voter's receipt number. Never includes the choices on the ballot. */
export interface ReceiptCheck {
  found: boolean;
  referenceNumber: string;
  election?: { id: string; title: string; year: number; isCurrent: boolean };
  voter?: { fullName: string; membershipNumber: string };
  castAt?: string;
  contestsVoted?: number;
  contestsAbstained?: number;
  linkHistory?: ReceiptLink[];
}
