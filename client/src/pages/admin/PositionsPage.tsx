import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActionMenu, Button, Card, EmptyState, ErrorState, Icon, PageHeader, Skeleton, useConfirm, useToast } from '../../components/ui';
import { useDeletePosition, usePositionsList } from '../../features/positions/usePositions';
import { PositionFormModal } from '../../features/positions/PositionFormModal';
import { useCurrentElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import type { Position } from '../../features/positions/types';

/** The ballot, as an ordered editorial list (reference 3): numeral, contest title, seats, candidates, actions. */
export function PositionsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isFetching } = usePositionsList();
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const isLocked = election?.isLocked ?? false;
  const [formPosition, setFormPosition] = useState<Position | null | undefined>(undefined);
  const deletePosition = useDeletePosition();
  const positions = data?.positions ?? [];

  const handleDelete = async (position: Position) => {
    const n = position._count?.candidates ?? 0;
    const ok = await confirm({
      title: `Delete “${position.title}”?`,
      message: n > 0 ? `Its ${n} candidate${n > 1 ? 's' : ''} will be deleted too. This cannot be undone.` : 'This cannot be undone.',
      confirmLabel: 'Delete position',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deletePosition.mutateAsync(position.id);
      toast({ title: 'Position deleted', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not delete position', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const totalCandidates = positions.reduce((s, p) => s + (p._count?.candidates ?? 0), 0);

  return (
    <>
      {election && <LockBanner election={election} />}
      <PageHeader
        kicker="Ballot"
        title="Positions"
        description="The contests on the ballot, in the order voters see them."
        actions={
          <Button leftIcon="add" disabled={isLocked} onClick={() => setFormPosition(null)}>
            Add position
          </Button>
        }
      />

      {isError && !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-b border-on-background/80">
            <p className="eyebrow !text-on-background">{positions.length} contests · {totalCandidates} candidates</p>
            <Link to="/admin/candidates" className="text-[0.8125rem] font-medium text-primary hover:underline underline-offset-4">
              Manage candidates
            </Link>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : positions.length === 0 ? (
            <EmptyState
              icon="list_alt"
              title="No positions yet"
              description="Add the first contest — for example President — to start building the ballot."
              action={
                <Button leftIcon="add" disabled={isLocked} onClick={() => setFormPosition(null)}>
                  Add position
                </Button>
              }
            />
          ) : (
            <ol className="ruled stagger">
              {positions.map((p, i) => {
                const n = p._count?.candidates ?? 0;
                return (
                  <li key={p.id} style={{ ['--i' as string]: i }} className="group grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3.5rem_1fr_8rem_8rem_auto] items-center gap-x-4 gap-y-1 px-5 sm:px-6 py-5 hover:bg-surface-bright transition-colors">
                    <span className="font-serif text-[1.75rem] leading-none text-outline tabular">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className="font-serif text-[1.375rem] leading-tight">{p.title}</p>
                      {p.description && <p className="mt-0.5 text-[0.875rem] text-secondary line-clamp-1">{p.description}</p>}
                      <p className="sm:hidden mt-1 text-[0.8125rem] text-secondary">
                        {p.maxSelections === 1 ? '1 seat' : `${p.maxSelections} seats`} · {n} candidate{n === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="eyebrow">Seats</p>
                      <p className="mt-0.5 tabular">{p.maxSelections}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="eyebrow">Candidates</p>
                      <p className={n === 0 ? 'mt-0.5 text-warning font-medium' : 'mt-0.5 tabular'}>{n === 0 ? 'None yet' : n}</p>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        aria-label={`Edit ${p.title}`}
                        disabled={isLocked}
                        onClick={() => setFormPosition(p)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-on-background hover:bg-surface-container-low disabled:opacity-40"
                      >
                        <Icon name="edit" size={17} />
                      </button>
                      <ActionMenu
                        label={`More actions for ${p.title}`}
                        items={[
                          { label: 'View candidates', icon: 'groups', onSelect: () => navigate(`/admin/candidates?position=${p.id}`) },
                          { label: 'Delete position', icon: 'delete', tone: 'danger', disabled: isLocked, onSelect: () => handleDelete(p) },
                        ]}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      )}

      <PositionFormModal
        open={formPosition !== undefined}
        position={formPosition}
        onClose={() => setFormPosition(undefined)}
        onSuccess={(message) => toast({ title: message, variant: 'success' })}
      />
    </>
  );
}
