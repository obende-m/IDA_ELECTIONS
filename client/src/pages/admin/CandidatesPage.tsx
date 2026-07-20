import { useMemo, useState } from 'react';
import { Badge, Button, DataTable, Field, Icon, SelectField, useToast, type DataTableColumn } from '../../components/ui';
import { useCandidatesList, useDeleteCandidate } from '../../features/candidates/useCandidates';
import { CandidateFormModal } from '../../features/candidates/CandidateFormModal';
import { usePositionsList } from '../../features/positions/usePositions';
import { useCurrentElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import type { Candidate } from '../../features/candidates/types';

/** Ported from candidate_management_admin_portal/code.html; wired to real candidate CRUD in the Election/Position/Candidate module. */
export function CandidatesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [formCandidate, setFormCandidate] = useState<Candidate | null | undefined>(undefined);

  const { data: positionsData } = usePositionsList();
  const { data: candidatesData, isLoading } = useCandidatesList(positionFilter === 'all' ? undefined : positionFilter);
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const isLocked = election?.isLocked ?? false;
  const deleteCandidate = useDeleteCandidate();

  const candidates = useMemo(() => {
    const all = candidatesData?.candidates ?? [];
    if (!search.trim()) return all;
    const term = search.trim().toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(term) || c.position?.title.toLowerCase().includes(term));
  }, [candidatesData, search]);

  const handleDelete = async (candidate: Candidate) => {
    if (!window.confirm(`Delete "${candidate.name}"? This cannot be undone.`)) return;
    try {
      await deleteCandidate.mutateAsync(candidate.id);
      toast({ title: 'Candidate deleted', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not delete candidate', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const columns: DataTableColumn<Candidate>[] = [
    {
      key: 'details',
      header: 'Candidate Details',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 overflow-hidden">
            {row.photoUrl ? (
              <img src={row.photoUrl} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Icon name="account_circle" className="text-secondary" size={28} />
            )}
          </div>
          <div>
            <p className="text-headline-sm font-headline-sm">{row.name}</p>
            {row.bio && <p className="text-label-sm font-label-sm text-secondary line-clamp-1 max-w-xs">{row.bio}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Position Title',
      render: (row) => <Badge variant="outline">{row.position?.title ?? '—'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-high hover:border-on-background transition-colors disabled:opacity-40 disabled:pointer-events-none"
            aria-label={`Edit ${row.name}`}
            disabled={isLocked}
            onClick={() => setFormCandidate(row)}
          >
            <Icon name="edit" size={18} />
          </button>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-error text-error hover:bg-error hover:text-on-error transition-colors disabled:opacity-40 disabled:pointer-events-none"
            aria-label={`Delete ${row.name}`}
            disabled={isLocked}
            onClick={() => handleDelete(row)}
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      ),
    },
  ];

  const positions = positionsData?.positions ?? [];

  return (
    <>
      {election && <LockBanner election={election} />}

      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-headline-xl font-headline-xl uppercase">Candidate Management</h1>
          <p className="text-body-lg text-secondary">Oversee official ballot entries for {election?.title ?? 'the current election'}.</p>
        </div>
        <Button
          variant="primary"
          leftIcon="add"
          uppercase
          disabled={isLocked || positions.length === 0}
          onClick={() => setFormCandidate(null)}
        >
          Add Candidate
        </Button>
      </section>

      {positions.length === 0 && (
        <p className="text-body-md text-secondary italic">Add at least one position before adding candidates.</p>
      )}

      <section className="bg-surface-container-low border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <Field
            icon="search"
            placeholder="Search by name or position..."
            aria-label="Search candidates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SelectField label="Filter by Position" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
          <option value="all">All Positions</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </SelectField>
      </section>

      <section className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          rows={candidates}
          rowKey={(row) => row.id}
          emptyMessage={isLoading ? 'Loading candidates…' : 'No candidates yet.'}
        />
        {candidates.length > 0 && (
          <div className="flex justify-between items-center px-4 py-4 bg-surface-container-lowest border-t border-outline-variant">
            <p className="text-label-md font-label-md text-secondary">
              Showing {candidates.length} of {candidates.length} candidates
            </p>
          </div>
        )}
      </section>

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
