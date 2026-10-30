import { useEffect, useState } from 'react';
import { ActionMenu, Badge, Button, Card, DataTable, PageHeader, Pagination, SearchInput, Tabs, useConfirm, useToast, type DataTableColumn, type MenuItem } from '../../components/ui';
import { useDeleteVoter, useIssueToken, useRevokeToken, useReplaceToken, useSetVoterActive, useVotersList } from '../../features/voters/useVoters';
import { votersApi } from '../../features/voters/votersApi';
import { buildInviteMessage } from '../../features/voters/inviteMessage';
import { VoterFormModal } from '../../features/voters/VoterFormModal';
import { ImportVotersModal } from '../../features/voters/ImportVotersModal';
import { useCurrentElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import type { Voter, VotingStatus } from '../../features/voters/types';

const STATUS: Record<VotingStatus, { label: string; variant: 'neutral' | 'gold' | 'success' | 'error' | 'teal' }> = {
  NOT_ISSUED: { label: 'No link', variant: 'neutral' },
  ISSUED: { label: 'Link sent', variant: 'gold' },
  VOTED: { label: 'Voted', variant: 'success' },
  REVOKED: { label: 'Revoked', variant: 'error' },
};

type Tab = 'all' | VotingStatus | 'inactive';
const PAGE_SIZE = 20;

/** Debounce a fast-changing value (search box) so we don't refetch on every keystroke. */
function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function VotersPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [formVoter, setFormVoter] = useState<Voter | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState<'voters' | 'links' | null>(null);

  useEffect(() => setPage(1), [debouncedSearch, tab]);

  const query = {
    search: debouncedSearch || undefined,
    status: tab === 'inactive' ? ('inactive' as const) : ('all' as const),
    votingStatus: tab !== 'all' && tab !== 'inactive' ? tab : undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useVotersList(query);
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const isLocked = election?.isLocked ?? false;

  const setActive = useSetVoterActive();
  const deleteVoter = useDeleteVoter();
  const issueToken = useIssueToken();
  const revokeToken = useRevokeToken();
  const replaceToken = useReplaceToken();

  const attempt = async (failureTitle: string, action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      toast({ title: failureTitle, description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const toggleActive = (v: Voter) =>
    attempt('Could not update voter', async () => {
      await setActive.mutateAsync({ id: v.id, isActive: !v.isActive });
      toast({ title: v.isActive ? 'Voter deactivated' : 'Voter activated', description: v.fullName, variant: 'success' });
    });

  const remove = async (v: Voter) => {
    if (!(await confirm({ title: `Delete ${v.fullName}?`, message: 'They will be removed from the voter roll. This cannot be undone.', confirmLabel: 'Delete voter', tone: 'danger' }))) return;
    await attempt('Could not delete voter', async () => {
      await deleteVoter.mutateAsync(v.id);
      toast({ title: 'Voter deleted', description: `${v.fullName} was removed from the roll.`, variant: 'success' });
    });
  };

  const copyLink = async (v: Voter) => {
    try {
      const { votingLink } = await votersApi.votingLink(v.id);
      await navigator.clipboard.writeText(
        buildInviteMessage({ fullName: v.fullName, votingLink, electionTitle: election?.title, endTime: election?.endTime })
      );
      toast({ title: 'Message copied', description: `Paste it into WhatsApp, SMS or email for ${v.fullName}. Their link is inside.`, variant: 'success' });
    } catch {
      toast({ title: 'Could not copy link', variant: 'error' });
    }
  };

  const issue = (v: Voter) =>
    attempt('Could not issue link', async () => {
      await issueToken.mutateAsync(v.id);
      toast({ title: 'Voting link issued', description: `Copy it from the row menu to send to ${v.fullName}.`, variant: 'success' });
    });

  const replace = async (v: Voter) => {
    if (v.votingStatus === 'ISSUED' && !(await confirm({ title: 'Issue a new link?', message: `${v.fullName}'s current link will stop working immediately.`, confirmLabel: 'Issue new link' }))) return;
    await attempt('Could not issue a new link', async () => {
      await replaceToken.mutateAsync(v.id);
      toast({ title: 'New voting link issued', description: 'The previous link was revoked.', variant: 'success' });
    });
  };

  const revoke = async (v: Voter) => {
    if (!(await confirm({ title: 'Revoke voting link?', message: `${v.fullName} will not be able to vote until a new link is issued.`, confirmLabel: 'Revoke link', tone: 'danger' }))) return;
    await attempt('Could not revoke link', async () => {
      await revokeToken.mutateAsync(v.id);
      toast({ title: 'Voting link revoked', variant: 'success' });
    });
  };

  const exportList = async (kind: 'voters' | 'links') => {
    setExporting(kind);
    try {
      await attempt(kind === 'voters' ? 'Could not export the voter list' : 'Could not download voting links', () =>
        kind === 'voters' ? votersApi.exportVoters(query) : votersApi.exportVotingLinks()
      );
    } finally {
      setExporting(null);
    }
  };

  const columns: DataTableColumn<Voter>[] = [
    {
      key: 'voter',
      header: 'Member',
      sortValue: (v) => v.fullName,
      render: (v) => (
        <div className="min-w-0">
          <p className="font-medium">{v.fullName}</p>
          <p className="font-mono text-[0.75rem] text-secondary">{v.membershipNumber}</p>
        </div>
      ),
    },
    { key: 'ward', header: 'Ward', hideOnMobile: true, sortValue: (v) => v.ward ?? '', render: (v) => <span className="text-on-surface-variant">{v.ward || '—'}</span> },
    {
      key: 'contact',
      header: 'Contact',
      hideOnMobile: true,
      render: (v) => (
        <div className="text-[0.8125rem] leading-snug">
          <p className="truncate max-w-[14rem]">{v.email || '—'}</p>
          <p className="text-secondary">{v.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Voting',
      sortValue: (v) => v.votingStatus,
      render: (v) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={STATUS[v.votingStatus].variant} dot>
            {STATUS[v.votingStatus].label}
          </Badge>
          {!v.isActive && <Badge variant="outline">Inactive</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (v) => {
        const items: MenuItem[] = [
          { label: 'Issue voting link', icon: 'link', hidden: v.votingStatus !== 'NOT_ISSUED', disabled: isLocked || !v.isActive, onSelect: () => issue(v) },
          { label: 'Copy message with link', icon: 'content_copy', hidden: v.votingStatus !== 'ISSUED', onSelect: () => copyLink(v) },
          { label: 'Issue new link', icon: 'refresh', hidden: v.votingStatus !== 'ISSUED' && v.votingStatus !== 'REVOKED', disabled: isLocked, onSelect: () => replace(v) },
          { label: 'Edit details', icon: 'edit', disabled: isLocked, onSelect: () => setFormVoter(v) },
          { label: v.isActive ? 'Deactivate' : 'Activate', icon: v.isActive ? 'block' : 'check_circle', disabled: isLocked, onSelect: () => toggleActive(v) },
          { label: 'Revoke link', icon: 'link_off', tone: 'danger', hidden: v.votingStatus !== 'ISSUED', disabled: isLocked, onSelect: () => revoke(v) },
          { label: 'Delete voter', icon: 'delete', tone: 'danger', hidden: v.votingStatus !== 'NOT_ISSUED', disabled: isLocked, onSelect: () => remove(v) },
        ];
        return (
          <div className="flex items-center justify-end gap-1">
            {v.votingStatus === 'ISSUED' && (
              <button
                type="button"
                onClick={() => copyLink(v)}
                className="hidden sm:inline-flex h-8 px-2.5 rounded-lg text-[0.8125rem] font-medium text-primary hover:bg-primary-soft items-center gap-1"
              >
                Copy message
              </button>
            )}
            {v.votingStatus === 'NOT_ISSUED' && v.isActive && (
              <button
                type="button"
                disabled={isLocked}
                onClick={() => issue(v)}
                className="hidden sm:inline-flex h-8 px-2.5 rounded-lg text-[0.8125rem] font-medium text-primary hover:bg-primary-soft items-center gap-1 disabled:opacity-40"
              >
                Issue link
              </button>
            )}
            <ActionMenu label={`Actions for ${v.fullName}`} items={items} />
          </div>
        );
      },
    },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {election && <LockBanner election={election} />}
      <PageHeader
        kicker="Electorate"
        title="Voters"
        description="The voter roll for this election, and each member's private voting link."
        actions={
          <>
            <Button variant="secondary" leftIcon="upload_file" disabled={isLocked} onClick={() => setImportOpen(true)}>
              Import
            </Button>
            <Button leftIcon="add" disabled={isLocked} onClick={() => setFormVoter(null)}>
              Add voter
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="px-5 sm:px-6 pt-2">
          <Tabs<Tab>
            label="Filter voters"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'all', label: 'All' },
              { value: 'NOT_ISSUED', label: 'No link' },
              { value: 'ISSUED', label: 'Link sent' },
              { value: 'VOTED', label: 'Voted' },
              { value: 'REVOKED', label: 'Revoked' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
        <div className="px-5 sm:px-6 py-4 border-b border-outline-variant flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} label="Search voters" placeholder="Name, membership no. or email…" className="w-full sm:max-w-md" />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" leftIcon="download" loading={exporting === 'voters'} onClick={() => exportList('voters')}>
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" leftIcon="link" loading={exporting === 'links'} onClick={() => exportList('links')}>
              Download links
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={data?.voters ?? []}
          rowKey={(v) => v.id}
          label="Voters"
          emptyMessage={search || tab !== 'all' ? 'No voters match this view.' : 'No voters yet — add a voter or import a roll.'}
          isLoading={isLoading}
          error={isError ? error : undefined}
          onRetry={() => refetch()}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          summary={total === 0 ? (isFetching ? 'Loading…' : 'No voters') : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} voters`}
          onPageChange={setPage}
        />
      </Card>

      <VoterFormModal open={formVoter !== undefined} voter={formVoter} onClose={() => setFormVoter(undefined)} onSuccess={(m) => toast({ title: m, variant: 'success' })} />
      <ImportVotersModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
