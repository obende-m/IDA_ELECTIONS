export type VotingStatus = 'NOT_ISSUED' | 'ISSUED' | 'VOTED' | 'REVOKED';

export interface Voter {
  id: string;
  electionId: string;
  membershipNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  ward: string | null;
  isActive: boolean;
  votingStatus: VotingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VoterListResult {
  voters: Voter[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VoterListQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  votingStatus?: VotingStatus;
  page?: number;
  pageSize?: number;
}

export interface VoterFormValues {
  membershipNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  ward?: string;
}

export interface ImportReportEntry {
  row: number;
  membershipNumber?: string;
  reason?: string;
}

export interface ImportReport {
  totalRows: number;
  imported: ImportReportEntry[];
  updated: ImportReportEntry[];
  skipped: ImportReportEntry[];
  duplicates: ImportReportEntry[];
  invalid: ImportReportEntry[];
}
