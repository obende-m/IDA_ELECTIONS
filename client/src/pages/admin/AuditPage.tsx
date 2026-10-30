import { useEffect, useState } from 'react';
import { Badge, Button, Card, DataTable, Field, Pagination, SearchInput, SelectField, PageHeader, type DataTableColumn } from '../../components/ui';
import { SensitiveNote } from '../../components/AdminNotices';
import { useAuditActions, useAuditLog } from '../../features/audit/useAudit';
import { useDebounced } from '../../lib/useDebounced';
import type { AuditLogEntry } from '../../features/audit/types';

const PAGE_SIZE = 25;
const humanize = (action: string) => action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const tone = (action: string): 'error' | 'warning' | 'success' | 'neutral' =>
  /DENIED|FAILED|LOCKED|REVOKED|DELETED/.test(action) ? 'error' : /UNLOCK|PAUSED|EXPORT|RECORDS_VIEWED/.test(action) ? 'warning' : /OPENED|CAST|ISSUED|CREATED/.test(action) ? 'success' : 'neutral';

/** Visible to every admin role: voter identity is redacted at the API layer, not by hiding this page. */
export function AuditPage() {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [debounced, action, from, to]);

  const { data: actionsData } = useAuditActions();
  const { data, isLoading, isError, error, refetch } = useAuditLog({ search: debounced || undefined, action: action || undefined, from: from || undefined, to: to || undefined, page, pageSize: PAGE_SIZE });

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'When',
      sortValue: (r) => r.timestamp,
      render: (r) => (
        <time dateTime={r.timestamp} className="font-mono text-[0.75rem] text-on-surface-variant whitespace-nowrap tabular">
          {new Date(r.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })}
        </time>
      ),
    },
    { key: 'action', header: 'Event', sortValue: (r) => r.action, render: (r) => <Badge variant={tone(r.action)}>{humanize(r.action)}</Badge> },
    {
      key: 'actor',
      header: 'By',
      render: (r) => r.actorName ?? <span className="text-secondary italic">{r.actorRole === 'VOTER' ? 'Voter (identity protected)' : 'System'}</span>,
    },
    { key: 'target', header: 'Target', hideOnMobile: true, render: (r) => <span className="text-secondary">{r.targetType ? humanize(r.targetType) : '—'}</span> },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(search || action || from || to);

  return (
    <>
      <PageHeader kicker="Oversight" title="Audit trail" description="Every security-relevant action, in order. Entries cannot be edited from the portal." />
      <SensitiveNote>
        Voter identities are never shown here — actions taken by a voter, such as casting a ballot, are recorded with their identity protected.
      </SensitiveNote>

      <Card className="overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-outline-variant grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_10rem_10rem_auto] items-end">
          <SearchInput value={search} onChange={setSearch} label="Search the audit trail" placeholder="Search events or people…" className="sm:col-span-2 lg:col-span-1" />
          <SelectField aria-label="Filter by event" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All events</option>
            {actionsData?.actions.map((a) => (
              <option key={a} value={a}>
                {humanize(a)}
              </option>
            ))}
          </SelectField>
          <Field type="date" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          <Field type="date" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setAction('');
                setFrom('');
                setTo('');
              }}
            >
              Clear
            </Button>
          ) : (
            <span />
          )}
        </div>
        <DataTable
          columns={columns}
          rows={data?.entries ?? []}
          rowKey={(r) => r.id}
          label="Audit trail"
          emptyMessage="No audit entries match your filters."
          isLoading={isLoading}
          error={isError ? error : undefined}
          onRetry={() => refetch()}
        />
        <Pagination page={page} totalPages={totalPages} summary={total === 0 ? 'No entries' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} entries`} onPageChange={setPage} />
      </Card>
    </>
  );
}
