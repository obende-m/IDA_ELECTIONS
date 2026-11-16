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
  /** When the current link actually went out (Twilio accepted it, or the admin confirmed sending it from their phone). Null = not sent yet. */
  linkSentAt: string | null;
  linkSentVia: 'SMS' | 'MY_SMS' | 'WHATSAPP' | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappQueueVoter {
  id: string;
  membershipNumber: string;
  fullName: string;
  phone: string | null;
  votingLink: string;
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
  /** Live link holders only: 'yes' = link sent, 'no' = not sent yet. */
  sent?: 'yes' | 'no';
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
