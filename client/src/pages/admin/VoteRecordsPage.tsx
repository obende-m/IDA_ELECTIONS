import { useState } from 'react';
import { Badge, DataTable, Field, Icon, type DataTableColumn } from '../../components/ui';
import { useVoteRecords } from '../../features/voteRecords/useVoteRecords';
import { useAuth } from '../../features/auth/AuthContext';
import type { VoteRecord } from '../../features/voteRecords/types';

const PAGE_SIZE = 25;
const AUTHORIZED_ROLES = ['SUPER_ADMIN', 'ELECTION_COMMITTEE'];

/**
 * No Stitch mock exists for this screen. Individual vote records are visible here only —
 * ELECTION_COMMITTEE / SUPER_ADMIN roles, server-enforced, never exposed via exports or public
 * APIs. Every load of this page is itself written to the audit log (see voting.service.ts).
 */
export function VoteRecordsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const isAuthorized = Boolean(user && AUTHORIZED_ROLES.includes(user.role));
  const { data, isLoading } = useVoteRecords(
    { search: search || undefined, page, pageSize: PAGE_SIZE },
    { enabled: isAuthorized }
  );

  if (!isAuthorized) {
    return (
      <section className="flex flex-col items-center justify-center text-center gap-4 rounded-xl border border-error shadow-sm py-24 px-8">
        <Icon name="lock" filled size={32} className="text-error" />
        <h1 className="text-headline-md font-headline-md uppercase">Access Restricted</h1>
        <p className="text-body-md text-secondary max-w-md">
          Individual vote records are only visible to Election Committee and Super Admin accounts.
        </p>
      </section>
    );
  }

  const columns: DataTableColumn<VoteRecord>[] = [
    {
      key: 'voter',
      header: 'Voter',
      render: (r) => (
        <div>
          <p className="text-headline-sm font-headline-sm">{r.voterName}</p>
          <p className="text-label-sm font-label-sm text-secondary">{r.membershipNumber}</p>
        </div>
      ),
    },
    { key: 'position', header: 'Position', render: (r) => <Badge variant="outline">{r.position}</Badge> },
    { key: 'candidate', header: 'Candidate Selected', render: (r) => r.candidate },
    {
      key: 'castAt',
      header: 'Time Cast',
      render: (r) => new Date(r.castAt).toLocaleString(),
    },
    {
      key: 'reference',
      header: 'Reference Number',
      render: (r) => <span className="font-mono text-label-sm">{r.referenceNumber}</span>,
    },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <section className="border-b border-outline-variant pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Individual Vote Records</h1>
        <p className="text-body-lg text-secondary">Election administration and verification only.</p>
      </section>

      <section className="flex items-start gap-3 bg-on-background text-on-primary rounded-xl shadow-sm border border-primary-container px-6 py-4">
        <Icon name="visibility" filled className="text-primary-container shrink-0" />
        <p className="text-body-md text-secondary-fixed">
          This screen shows who voted for whom. Access is restricted to Election Committee and Super Admin roles. Every time
          this page is loaded, a permanent audit log entry is created recording your identity, role, timestamp, IP address,
          and browser — this is by design, not a bug.
        </p>
      </section>

      <section className="bg-surface-container-low border border-outline-variant rounded-xl shadow-sm p-6">
        <Field
          icon="search"
          placeholder="Search by voter name or membership number..."
          aria-label="Search vote records"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </section>

      <section className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.records ?? []}
          rowKey={(r) => r.id}
          emptyMessage={isLoading ? 'Loading vote records…' : 'No vote records match your search.'}
        />
        <div className="flex justify-between items-center px-4 py-4 bg-surface-container-lowest border-t border-outline-variant">
          <p className="text-label-md font-label-md text-secondary">
            {total === 0 ? 'No records' : `Page ${page} of ${totalPages} — ${total} records`}
          </p>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
