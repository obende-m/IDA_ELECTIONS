import { useState } from 'react';
import { Badge, DataTable, Field, Icon, SelectField, type DataTableColumn } from '../../components/ui';
import { useAuditActions, useAuditLog } from '../../features/audit/useAudit';
import type { AuditLogEntry } from '../../features/audit/types';

const PAGE_SIZE = 25;

/**
 * No Stitch mock exists for this screen. Unlike Vote Records, this is visible to any admin role —
 * individual voter identity is protected by redaction at the API layer (redactActorName, see
 * server/src/lib/audit.ts), not by restricting who can view the page.
 */
export function AuditPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: actionsData } = useAuditActions();
  const { data, isLoading } = useAuditLog({
    search: search || undefined,
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const resetToFirstPage = () => setPage(1);

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: 'timestamp', header: 'Timestamp', render: (r) => new Date(r.timestamp).toLocaleString() },
    { key: 'action', header: 'Action', render: (r) => <Badge variant="outline">{r.action}</Badge> },
    { key: 'actor', header: 'Actor', render: (r) => r.actorName ?? (r.actorRole === 'VOTER' ? 'Voter (identity protected)' : '—') },
    { key: 'targetType', header: 'Target', render: (r) => r.targetType ?? '—' },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Audit Logs</h1>
        <p className="text-body-lg text-secondary">Searchable trail of every security-relevant system action.</p>
      </section>

      <section className="flex items-start gap-3 bg-on-background text-on-primary border-2 border-primary-container px-6 py-4">
        <Icon name="security" filled className="text-primary-container shrink-0" />
        <p className="text-body-md text-secondary-fixed">
          Individual voter identities are never shown here — actions performed by a voter (e.g. casting a ballot) are
          recorded with their identity protected. This log cannot be edited or deleted.
        </p>
      </section>

      <section className="bg-surface-container-low border border-on-background p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Field
            icon="search"
            placeholder="Search by action or target..."
            aria-label="Search audit log"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetToFirstPage();
            }}
          />
        </div>
        <SelectField
          aria-label="Filter by action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            resetToFirstPage();
          }}
        >
          <option value="">All Actions</option>
          {actionsData?.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-2">
          <Field
            type="date"
            aria-label="From date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              resetToFirstPage();
            }}
          />
          <Field
            type="date"
            aria-label="To date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              resetToFirstPage();
            }}
          />
        </div>
      </section>

      <section className="bg-surface border border-on-background">
        <DataTable
          columns={columns}
          rows={data?.entries ?? []}
          rowKey={(r) => r.id}
          emptyMessage={isLoading ? 'Loading audit log…' : 'No audit entries match your filters.'}
        />
        <div className="flex justify-between items-center px-4 py-4 bg-surface-container-lowest border-t border-outline-variant">
          <p className="text-label-md font-label-md text-secondary">
            {total === 0 ? 'No entries' : `Page ${page} of ${totalPages} — ${total} entries`}
          </p>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 flex items-center justify-center border border-on-background disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center border border-on-background disabled:opacity-40"
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
