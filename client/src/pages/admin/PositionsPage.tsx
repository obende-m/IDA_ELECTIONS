import { useState } from 'react';
import { Badge, Button, DataTable, Icon, useToast, type DataTableColumn } from '../../components/ui';
import { useDeletePosition, usePositionsList } from '../../features/positions/usePositions';
import { PositionFormModal } from '../../features/positions/PositionFormModal';
import { useCurrentElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import type { Position } from '../../features/positions/types';

export function PositionsPage() {
  const { toast } = useToast();
  const { data, isLoading } = usePositionsList();
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const isLocked = election?.isLocked ?? false;
  const [formPosition, setFormPosition] = useState<Position | null | undefined>(undefined);
  const deletePosition = useDeletePosition();

  const handleDelete = async (position: Position) => {
    const candidateCount = position._count?.candidates ?? 0;
    const warning =
      candidateCount > 0
        ? `Delete "${position.title}"? This will also delete its ${candidateCount} candidate(s). This cannot be undone.`
        : `Delete "${position.title}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    try {
      await deletePosition.mutateAsync(position.id);
      toast({ title: 'Position deleted', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not delete position', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const columns: DataTableColumn<Position>[] = [
    {
      key: 'title',
      header: 'Position',
      render: (p) => (
        <div>
          <p className="text-headline-sm font-headline-sm">{p.title}</p>
          {p.description && <p className="text-label-sm font-label-sm text-secondary">{p.description}</p>}
        </div>
      ),
    },
    {
      key: 'maxSelections',
      header: 'Max Selections',
      align: 'center',
      render: (p) => p.maxSelections,
    },
    {
      key: 'candidates',
      header: 'Candidates',
      align: 'center',
      render: (p) => <Badge variant="outline">{p._count?.candidates ?? 0}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex justify-end gap-2">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-high hover:border-on-background transition-colors disabled:opacity-40 disabled:pointer-events-none"
            aria-label={`Edit ${p.title}`}
            disabled={isLocked}
            onClick={() => setFormPosition(p)}
          >
            <Icon name="edit" size={18} />
          </button>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-error text-error hover:bg-error hover:text-on-error transition-colors disabled:opacity-40 disabled:pointer-events-none"
            aria-label={`Delete ${p.title}`}
            disabled={isLocked}
            onClick={() => handleDelete(p)}
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {election && <LockBanner election={election} />}

      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-headline-xl font-headline-xl uppercase">Positions</h1>
          <p className="text-body-lg text-secondary">Configure ballot positions, display order, and max selections.</p>
        </div>
        <Button variant="primary" leftIcon="add" disabled={isLocked} onClick={() => setFormPosition(null)}>
          Add Position
        </Button>
      </section>

      <section className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.positions ?? []}
          rowKey={(p) => p.id}
          emptyMessage={isLoading ? 'Loading positions…' : 'No positions yet. Add one to start building the ballot.'}
        />
      </section>

      <PositionFormModal
        open={formPosition !== undefined}
        position={formPosition}
        onClose={() => setFormPosition(undefined)}
        onSuccess={(message) => toast({ title: message, variant: 'success' })}
      />
    </>
  );
}
