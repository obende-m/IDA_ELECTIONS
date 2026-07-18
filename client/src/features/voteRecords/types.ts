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
