import { Badge, Button, Card, CardHeader, CardTitle, ErrorState, Icon, PageHeader, PageSkeleton, RadialProgress } from '../../components/ui';
import { useAnalytics } from '../../features/analytics/useAnalytics';
import { getPositionOutcome, type PositionResult } from '../../features/analytics/types';
import { cn } from '../../lib/cn';
import { LinksCard } from '../../components/LinksCard';

/** One contest as an editorial ruled list, ranked by votes, with a proportional bar per candidate. */
function ContestResult({ position, index }: { position: PositionResult; index: number }) {
  const outcome = getPositionOutcome(position);
  const ranked = [...position.candidates].sort((a, b) => b.voteCount - a.voteCount);
  const seats = Math.max(1, position.maxSelections);
  const max = Math.max(1, ...ranked.map((c) => c.voteCount));
  return (
    <section aria-labelledby={`contest-${position.id}`} className="animate-rise" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3 border-b border-on-background">
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-[1.5rem] text-outline tabular">{String(index + 1).padStart(2, '0')}</span>
          <h2 id={`contest-${position.id}`} className="font-serif text-[1.75rem] leading-tight">
            {position.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {seats > 1 && <Badge variant="outline">{seats} seats</Badge>}
          {outcome.kind === 'tie' && (
            <Badge variant="warning" icon="balance" title="Candidates are level at the cut-off; no single winner can be named">
              Tie
            </Badge>
          )}
          {outcome.kind === 'none' && <Badge variant="neutral">No votes yet</Badge>}
        </div>
      </div>
      {ranked.length === 0 ? (
        <p className="py-6 text-secondary text-[0.9rem]">No candidates for this position.</p>
      ) : (
        <ol>
          {ranked.map((c, i) => {
            const leading = outcome.kind === 'leader' && i < seats && c.voteCount > 0;
            return (
              <li
                key={c.id}
                className={cn(
                  'grid grid-cols-[1.75rem_1fr_auto] sm:grid-cols-[2rem_minmax(10rem,1fr)_2fr_7rem] items-center gap-x-4 gap-y-2 py-3.5 border-b border-outline-variant',
                  leading && 'font-medium'
                )}
              >
                <span className="font-mono text-[0.75rem] text-secondary tabular">{i + 1}</span>
                <span className="min-w-0 flex items-center gap-2">
                  <span className="truncate">{c.name}</span>
                  {leading && <Icon name="check_circle" size={15} className="text-success shrink-0" aria-label="Currently within the winning places" />}
                </span>
                <div className="col-span-3 sm:col-span-1 row-start-2 sm:row-start-auto">
                  <div
                    className="h-2 rounded-full bg-surface-container overflow-hidden"
                    role="progressbar"
                    aria-label={`${c.name}: ${c.pct}% of ballots`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={c.pct}
                  >
                    <div
                      className={cn('h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quart)]', leading ? 'bg-primary' : 'bg-on-background/70')}
                      style={{ width: `${(c.voteCount / max) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-right tabular whitespace-nowrap">
                  {c.voteCount.toLocaleString()} <span className="text-secondary text-[0.8125rem]">· {c.pct}%</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-2 text-[0.75rem] text-secondary">
        Abstentions: <span className="tabular">{position.abstentions.toLocaleString()}</span>
      </p>
    </section>
  );
}

/** Live / certified results. Same analytics source as the dashboard and reports. */
export function ResultsPage() {
  const { data: analytics, refetch, isFetching, isLoading, isError, error } = useAnalytics();
  const certified = analytics?.certifiedAt;

  return (
    <>
      <PageHeader
        kicker={certified ? 'Certified results' : 'Live results'}
        title={analytics?.election.title ?? 'Results'}
        description={
          certified
            ? `Final figures, frozen at certification on ${new Date(certified).toLocaleString()}.`
            : 'Provisional counts, updated every 10 seconds while voting is open. Not final until the election is closed and certified.'
        }
        actions={
          <Button variant="secondary" leftIcon="refresh" loading={isFetching} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <PageSkeleton />
      ) : isError && !analytics ? (
        <ErrorState title="Could not load results" message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} retrying={isFetching} />
      ) : analytics ? (
        <>
          {isError && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-error/25 bg-error-container/50 px-4 py-3">
              <p className="text-[0.875rem] text-on-error-container">Could not refresh — showing the last results received.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
                Retry
              </Button>
            </div>
          )}
          {!certified && (
            <div className="flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-[0.875rem] text-warning">
              <span className="live-dot" aria-hidden="true" />
              Provisional — counts change as ballots arrive.
            </div>
          )}

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-12 min-w-0">
              {analytics.positions.length > 0 ? (
                analytics.positions.map((p, i) => <ContestResult key={p.id} position={p} index={i} />)
              ) : (
                <p className="py-10 text-center text-secondary">No positions have been configured yet.</p>
              )}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 self-start">
              <Card>
                <CardHeader>
                  <CardTitle kicker="Participation">Turnout</CardTitle>
                </CardHeader>
                <div className="p-6 flex flex-col items-center gap-4">
                  <RadialProgress
                    value={analytics.turnoutPct}
                    size={176}
                    label={<span className="font-serif text-[2.25rem] leading-none tabular">{analytics.turnoutPct.toFixed(1)}%</span>}
                    sublabel={<span className="mt-1 eyebrow">of the roll</span>}
                  />
                  <dl className="w-full grid grid-cols-2 border-t border-outline-variant pt-4 text-center">
                    <div>
                      <dt className="eyebrow">Ballots</dt>
                      <dd className="mt-1 font-serif text-[1.5rem] tabular">{analytics.ballotsCast.toLocaleString()}</dd>
                    </div>
                    <div className="border-l border-outline-variant">
                      <dt className="eyebrow">Registered</dt>
                      <dd className="mt-1 font-serif text-[1.5rem] tabular">{analytics.registeredVoters.toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              </Card>
              <LinksCard links={analytics.links} showManage={false} />
              <Card className="p-5 text-[0.8125rem] text-secondary space-y-2">
                <p className="flex gap-2">
                  <Icon name="info" size={15} className="mt-0.5 shrink-0" />
                  Percentages are of ballots cast. In multi-seat contests each ballot can support several candidates.
                </p>
                <p className="flex gap-2">
                  <Icon name="balance" size={15} className="mt-0.5 shrink-0" />A tie is flagged instead of naming a winner.
                </p>
              </Card>
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}
