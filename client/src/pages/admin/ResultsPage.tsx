import { Badge, Button, ErrorState, Icon, LoadingState, RadialProgress } from '../../components/ui';
import { useAnalytics } from '../../features/analytics/useAnalytics';
import { getPositionOutcome } from '../../features/analytics/types';

function formatElapsed(startTime: string | null): string {
  if (!startTime) return '—';
  const diffMs = Date.now() - new Date(startTime).getTime();
  if (diffMs <= 0) return '00:00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Every number here comes from useAnalytics() — the same hook and endpoint DashboardPage consumes, so there's one source of truth for election results. */
export function ResultsPage() {
  const { data: analytics, refetch, isFetching, isLoading, isError, error } = useAnalytics();

  return (
    <>
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-headline-lg-mobile md:text-headline-xl font-headline-xl uppercase">Live Results</h1>
          <p className="text-label-md font-label-md text-error flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-error inline-block" />
            Real-time Election Analytics — {analytics?.election.title ?? 'Election'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" leftIcon="refresh" loading={isFetching} onClick={() => refetch()}>
            Refresh Data
          </Button>
        </div>
      </section>

      {isLoading ? (
        <LoadingState label="Loading results…" hint="If the server has been idle this can take up to a minute." />
      ) : isError && !analytics ? (
        <ErrorState
          title="Could not load results"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : (
        <>
          {isError && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-container/40 px-4 py-3">
              <p className="text-body-md text-on-error-container">Could not refresh. Showing the last results we received.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
                Retry
              </Button>
            </div>
          )}

          <div className="bento-grid">
            <div className="col-span-12 lg:col-span-8 bg-surface border-t-2 border-primary-container border-x border-b border-outline-variant rounded-xl shadow-sm p-5 sm:p-8 flex flex-col gap-8">
              <div className="flex justify-between items-center gap-3">
                <h3 className="text-headline-sm font-headline-sm uppercase">Current Standings</h3>
                <Badge variant="gold">Verified Counts</Badge>
              </div>

              {analytics && analytics.positions.length > 0 ? (
                <div className="space-y-10">
                  {analytics.positions.map((position) => {
                    const outcome = getPositionOutcome(position);
                    return (
                      <div key={position.id}>
                        <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-1 mb-4 border-b border-outline-variant pb-2">
                          <h4 className="text-headline-sm font-headline-sm uppercase">{position.title}</h4>
                          {outcome.kind === 'leader' && (
                            <span className="text-label-sm font-label-sm text-secondary uppercase">Leading: {outcome.name}</span>
                          )}
                          {outcome.kind === 'tie' && (
                            <Badge variant="gold" icon="balance" title="Two or more candidates are level; no single winner can be named">
                              Tie
                            </Badge>
                          )}
                        </div>
                        {position.candidates.length > 0 ? (
                          <div className="space-y-6">
                            {position.candidates.map((c) => (
                              <div key={c.id}>
                                <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-1 mb-2">
                                  <span className="text-label-md font-label-md uppercase text-secondary break-words min-w-0">{c.name}</span>
                                  <span className="text-headline-sm font-headline-sm">
                                    {c.voteCount.toLocaleString()} Votes ({c.pct}%)
                                  </span>
                                </div>
                                <div
                                  className="w-full h-3 bg-surface-container rounded-full overflow-hidden"
                                  role="progressbar"
                                  aria-label={`${c.name}: ${c.pct}% of votes`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={c.pct}
                                >
                                  <div className="h-full bg-on-background rounded-full" style={{ width: `${c.pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-body-md text-secondary italic">No candidates registered for this position.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-body-md text-secondary italic py-8 text-center">No positions have been configured yet.</p>
              )}
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-8 flex flex-col items-center gap-4">
                <p className="text-label-md font-label-md uppercase text-secondary tracking-widest">Total Voter Turnout</p>
                <RadialProgress
                  value={analytics?.turnoutPct ?? 0}
                  label={<span className="text-headline-lg font-headline-lg">{(analytics?.turnoutPct ?? 0).toFixed(1)}%</span>}
                  sublabel={<span className="text-label-sm font-label-sm text-secondary">of registered</span>}
                />
                <p className="text-label-sm font-label-sm text-secondary">
                  {(analytics?.ballotsCast ?? 0).toLocaleString()} / {(analytics?.registeredVoters ?? 0).toLocaleString()} voted
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-on-background text-on-primary rounded-xl shadow-sm p-4 flex flex-col gap-2">
                  <Icon name="timer" className="text-primary-container" />
                  <p className="text-label-sm font-label-sm text-primary-container uppercase">Polling Duration</p>
                  <p className="text-headline-sm font-headline-sm">{formatElapsed(analytics?.election.startTime ?? null)}</p>
                </div>
                <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-4 flex flex-col gap-2">
                  <Icon name="shield" className="text-primary" />
                  <p className="text-label-sm font-label-sm text-secondary uppercase">Connection</p>
                  <p className="text-headline-sm font-headline-sm">HTTPS</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
