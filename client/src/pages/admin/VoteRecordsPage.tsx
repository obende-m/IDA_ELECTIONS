import { useEffect, useState } from 'react';
import { Badge, Card, DataTable, PageHeader, Pagination, SearchInput, type DataTableColumn } from '../../components/ui';
import { RestrictedNotice, SensitiveNote } from '../../components/AdminNotices';
import { useVoteRecords } from '../../features/voteRecords/useVoteRecords';
import { useAuth } from '../../features/auth/AuthContext';
import { useDebounced } from '../../lib/useDebounced';
import type { VoteRecord } from '../../features/voteRecords/types';

const PAGE_SIZE = 25;
const AUTHORIZED = ['SUPER_ADMIN', 'ELECTION_COMMITTEE'];

/** Election Committee / Super Admin only (server-enforced); every load is itself audit-logged. */
export function VoteRecordsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 350);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [debounced]);
  const isAuthorized = Boolean(user && AUTHORIZED.includes(user.role));
  const { data, isLoading, isError, error, refetch } = useVoteRecords({ search: debounced || undefined, page, pageSize: PAGE_SIZE }, { enabled: isAuthorized });

  if (!isAuthorized) return <RestrictedNotice>Individual vote records are only visible to Election Committee and Super Admin accounts.</RestrictedNotice>;

  const columns: DataTableColumn<VoteRecord>[] = [
    {
      key: 'voter',
      header: 'Voter',
      sortValue: (r) => r.voterName,
      render: (r) => (
        <div>
          <p className="font-medium">{r.voterName}</p>
          <p className="font-mono text-[0.75rem] text-secondary">{r.membershipNumber}</p>
        </div>
      ),
    },
    { key: 'position', header: 'Contest', sortValue: (r) => r.position, render: (r) => <Badge variant="outline">{r.position}</Badge> },
    { key: 'candidate', header: 'Choice', sortValue: (r) => r.candidate, render: (r) => r.candidate },
    { key: 'castAt', header: 'Cast', hideOnMobile: true, sortValue: (r) => r.castAt, render: (r) => <span className="text-secondary tabular">{new Date(r.castAt).toLocaleString()}</span> },
    { key: 'reference', header: 'Reference', hideOnMobile: true, render: (r) => <span className="font-mono text-[0.75rem]">{r.referenceNumber}</span> },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader kicker="Restricted · Committee only" title="Vote records" description="Individual ballots, for verification and dispute resolution only." />
      <SensitiveNote icon="visibility">
        This screen shows who voted for whom. Each time it loads, a permanent audit entry records your name, role, time, IP address and browser — by design.
      </SensitiveNote>
      <Card className="overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-outline-variant">
          <SearchInput value={search} onChange={setSearch} label="Search vote records" placeholder="Voter name or membership no.…" className="max-w-md" />
        </div>
        <DataTable columns={columns} rows={data?.records ?? []} rowKey={(r) => r.id} label="Individual vote records" emptyMessage="No vote records match your search." isLoading={isLoading} error={isError ? error : undefined} onRetry={() => refetch()} />
        <Pagination page={page} totalPages={totalPages} summary={total === 0 ? 'No records' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} records`} onPageChange={setPage} />
      </Card>
    </>
  );
}
