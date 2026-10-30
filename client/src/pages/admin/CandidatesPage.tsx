import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActionMenu, Badge, Button, Card, DataTable, PageHeader, SearchInput, Tabs, useConfirm, useToast, type DataTableColumn } from '../../components/ui';
import { useCandidatesList, useDeleteCandidate } from '../../features/candidates/useCandidates';
import { CandidateFormModal } from '../../features/candidates/CandidateFormModal';
import { usePositionsList } from '../../features/positions/usePositions';
import { useCurrentElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import type { Candidate } from '../../features/candidates/types';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Candidates grouped by contest via tabs (reference 1: listing + search + tabs + row actions). */
export function CandidatesPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const positionFilter = params.get('position') ?? 'all';
  const [search, setSearch] = useState('');
  const [formCandidate, setFormCandidate] = useState<Candidate | null | undefined>(undefined);

  const { data: positionsData } = usePositionsList();
  const { data: candidatesData, isLoading, isError, error, refetch } = useCandidatesList();
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const isLocked = election?.isLocked ?? false;
  const deleteCandidate = useDeleteCandidate();
  const positions = positionsData?.positions ?? [];
  const all = candidatesData?.candidates ?? [];

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter(
      (c) =>
        (positionFilter === 'all' || c.positionId === positionFilter || c.position?.id === positionFilter) &&
        (!term || c.name.toLowerCase().includes(term) || c.position?.title.toLowerCase().includes(term))
    );
  }, [all, search, positionFilter]);

  const handleDelete = async (candidate: Candidate) => {
    const ok = await confirm({ title: `Delete ${candidate.name}?`, message: 'They will be removed from the ballot. This cannot be undone.', confirmLabel: 'Delete candidate', tone: 'danger' });
    if (!ok) return;
    try {
      await deleteCandidate.mutateAsync(candidate.id);
      toast({ title: 'Candidate deleted', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not delete candidate', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const columns: DataTableColumn<Candidate>[] = [
    {
      key: 'name',
      header: 'Candidate',
      sortValue: (r) => r.name,
      render: (row) => (
        <div className="flex items-center gap-3.5">
          {row.photoUrl ? (
            <img src={row.photoUrl} alt="" loading="lazy" className="w-11 h-11 rounded-xl object-cover bg-surface-container shrink-0" />
          ) : (
            <span className="w-11 h-11 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center font-serif shrink-0" aria-hidden="true">
              {initials(row.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-medium">{row.name}</p>
            {row.bio ? <p className="text-[0.8125rem] text-secondary line-clamp-1 max-w-md">{row.bio}</p> : <p className="text-[0.8125rem] text-outline italic">No biography</p>}
          </div>
        </div>
      ),
    },
    { key: 'position', header: 'Contest', sortValue: (r) => r.position?.title ?? '', render: (row) => <Badge variant="outline">{row.position?.title ?? '—'}</Badge> },
    {
      key: 'photo',
      header: 'Photo',
      hideOnMobile: true,
      render: (row) => (row.photoUrl ? <Badge variant="success" icon="check">Added</Badge> : <Badge variant="neutral">Missing</Badge>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <ActionMenu
            label={`Actions for ${row.name}`}
            items={[
              { label: 'Edit details & photo', icon: 'edit', disabled: isLocked, onSelect: () => setFormCandidate(row) },
              { label: 'Delete candidate', icon: 'delete', tone: 'danger', disabled: isLocked, onSelect: () => handleDelete(row) },
            ]}
          />
        </div>
      ),
    },
  ];

  const tabItems = [
    { value: 'all', label: 'All contests', count: all.length },
    ...positions.map((p) => ({ value: p.id, label: p.title, count: all.filter((c) => c.positionId === p.id || c.position?.id === p.id).length })),
  ];

  return (
    <>
      {election && <LockBanner election={election} />}
      <PageHeader
        kicker="Ballot"
        title="Candidates"
        description={`Everyone standing in ${election?.title ?? 'the current election'}. Shown to voters in the same neutral format.`}
        actions={
          <Button leftIcon="add" disabled={isLocked || positions.length === 0} onClick={() => setFormCandidate(null)}>
            Add candidate
          </Button>
        }
      />
      {positions.length === 0 && !isLoading && (
        <p className="rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-[0.875rem] text-warning">Add at least one position before adding candidates.</p>
      )}

      <Card className="overflow-hidden">
        <div className="px-5 sm:px-6 pt-2">
          <Tabs
            label="Filter by contest"
            value={positionFilter}
            onChange={(v) => setParams(v === 'all' ? {} : { position: v }, { replace: true })}
            items={tabItems}
          />
        </div>
        <div className="px-5 sm:px-6 py-4 border-b border-outline-variant">
          <SearchInput value={search} onChange={setSearch} label="Search candidates" placeholder="Search by name or contest…" className="max-w-md" />
        </div>
        <DataTable
          columns={columns}
          rows={candidates}
          rowKey={(row) => row.id}
          label="Candidates"
          emptyMessage={search.trim() || positionFilter !== 'all' ? 'No candidates match this view.' : 'No candidates yet — add the first one.'}
          isLoading={isLoading}
          error={isError ? error : undefined}
          onRetry={() => refetch()}
        />
        {candidates.length > 0 && (
          <p className="px-5 sm:px-6 py-3 text-[0.8125rem] text-secondary border-t border-outline-variant">
            Showing {candidates.length} of {all.length} candidates
          </p>
        )}
      </Card>

      <CandidateFormModal
        open={formCandidate !== undefined}
        candidate={formCandidate}
        defaultPositionId={positionFilter !== 'all' ? positionFilter : undefined}
        onClose={() => setFormCandidate(undefined)}
        onSuccess={(message) => toast({ title: message, variant: 'success' })}
      />
    </>
  );
}
