import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, StatCard, StatusPill, Icon, useToast } from '../../components/ui';
import { useCurrentElection, useLockElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import { LockReasonModal } from '../../features/elections/LockReasonModal';
import { useAnalytics } from '../../features/analytics/useAnalytics';
import { useAuth } from '../../features/auth/AuthContext';
import { canManageElection } from '../../features/auth/permissions';
import type { RecentActivityEntry } from '../../features/analytics/types';

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  VOTE_CAST: 'A ballot was cast.',
  TOKEN_ISSUED: 'A voting token was issued.',
  TOKEN_REPLACEMENT_ISSUED: 'A voting token was reissued.',
  VOTER_IMPORT_COMPLETED: 'Voter roster import completed.',
  ELECTION_OPENED: 'Election opened for voting.',
  ELECTION_PAUSED: 'Election paused.',
  ELECTION_RESUMED: 'Election resumed.',
  ELECTION_CLOSED: 'Election closed.',
  ELECTION_LOCKED: 'Election locked.',
  ELECTION_UNLOCKED: 'Election unlocked.',
};

function describeActivity(entry: RecentActivityEntry): string {
  const base = ACTIVITY_DESCRIPTIONS[entry.action] ?? entry.action;
  return entry.actorName ? `${base} (${entry.actorName})` : base;
}

function formatTimeRemaining(endTime: string | null): string {
  if (!endTime) return '—';
  const diffMs = new Date(endTime).getTime() - Date.now();
  if (diffMs <= 0) return '00:00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Every statistic here comes from useAnalytics() — the same hook and endpoint ResultsPage consumes, so there's one source of truth for election numbers. */
export function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = canManageElection(user?.role);
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const { data: analytics, isLoading, isError, error, refetch, isFetching } = useAnalytics();
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const lockElection = useLockElection();
  const navigate = useNavigate();

  // Re-render every second so the "Time Remaining" countdown actually counts down between the 10 s data refreshes.
  const [, setTick] = useState(0);
  const endTime = analytics?.election.endTime ?? null;
  useEffect(() => {
    if (!endTime) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [endTime]);

  const handleLock = async (reason: string) => {
    await lockElection.mutateAsync(reason);
    toast({ title: 'Election locked', description: 'No further changes can be made until a Super Admin unlocks it.', variant: 'success' });
    setLockModalOpen(false);
  };

  const maxHourly = Math.max(1, ...(analytics?.timeline.map((t) => t.ballotsCast) ?? [0]));
  const dash = '—';

  return (
    <>
      {election && <LockBanner election={election} />}

      {isError && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-container/40 px-4 py-3">
          <p className="text-body-md text-on-error-container">
            {analytics
              ? 'Could not refresh the live numbers. Showing the last data we received.'
              : `Could not load election statistics. ${error instanceof Error ? error.message : ''}`}
          </p>
          <Button variant="secondary" size="sm" leftIcon="refresh" loading={isFetching} onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <section className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-headline-lg-mobile md:text-headline-xl font-headline-xl uppercase">Dashboard</h1>
          <p className="font-body-lg text-body-lg text-secondary">Real-time election participation monitoring.</p>
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <StatusPill
            label={`Election Status: ${election?.status ?? '—'}`}
            live={election?.status === 'ACTIVE'}
          />
          <div className="text-headline-sm font-headline-sm text-on-background tracking-tighter">
            Time Remaining: {formatTimeRemaining(endTime)}
          </div>
        </div>
      </section>

      <section aria-busy={isLoading} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-gutter">
        <StatCard
          label="Registered Voters"
          value={analytics ? analytics.registeredVoters.toLocaleString() : dash}
          icon="group_add"
          helpText="Total in this election"
        />
        <StatCard label="Ballots Cast" value={analytics ? analytics.ballotsCast.toLocaleString() : dash} icon="how_to_vote" helpText="Verified submissions" />
        <StatCard
          label="Turnout %"
          value={
            <>
              <span>{analytics ? `${analytics.turnoutPct.toFixed(1)}%` : dash}</span>
              <div className="w-full h-2 bg-surface-container rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${analytics?.turnoutPct ?? 0}%` }} />
              </div>
            </>
          }
          icon="percent"
        />
        <StatCard label="Time Remaining" value={formatTimeRemaining(endTime)} icon="timer" helpText="Until polls close" inverse />
      </section>

      <div className="bento-grid">
        <div className="col-span-12 lg:col-span-8 bg-surface border border-outline-variant rounded-xl shadow-sm p-5 sm:p-8 flex flex-col gap-6 min-w-0">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-headline-sm text-headline-sm uppercase">Live Voting Activity</h3>
              <p className="text-label-md font-label-md text-secondary">Hourly voting volume since the election opened</p>
            </div>
            <p className="text-label-sm font-label-sm text-secondary uppercase tracking-widest">Auto-refreshes every 10 s</p>
          </div>
          {isLoading ? (
            <div role="status" className="h-64 w-full bg-surface-container rounded-lg border border-outline-variant flex items-center justify-center">
              <p className="text-label-md font-label-md text-secondary uppercase tracking-widest">Loading activity…</p>
            </div>
          ) : analytics && analytics.timeline.length > 0 ? (
            <div
              role="img"
              aria-label={`Bar chart of ballots cast per hour. ${analytics.timeline
                .map((p) => `${new Date(p.hourBucket).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}: ${p.ballotsCast}`)
                .join(', ')}`}
              tabIndex={0}
              className="relative h-72 w-full bg-surface-container rounded-lg border border-outline-variant overflow-x-auto"
            >
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              <div className="relative flex items-stretch justify-around gap-3 h-full w-full min-w-max px-4 py-3">
                {analytics.timeline.map((point) => (
                  <div key={point.hourBucket} className="flex flex-col items-center w-14 shrink-0 h-full">
                    <span className="text-label-sm font-label-sm font-bold h-5">{point.ballotsCast}</span>
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full bg-on-background rounded-t-md"
                        style={{ height: `${Math.max(2, (point.ballotsCast / maxHourly) * 100)}%` }}
                      />
                    </div>
                    <span className="text-label-sm font-label-sm text-secondary uppercase mt-2 whitespace-nowrap">
                      {new Date(point.hourBucket).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 w-full bg-surface-container rounded-lg border border-outline-variant flex items-center justify-center">
              <p className="text-label-md font-label-md text-secondary uppercase tracking-widest">No voting activity yet</p>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl shadow-sm p-5 sm:p-8 flex flex-col gap-6">
          <div className="border-b border-primary-container/60 pb-4">
            <h3 className="font-headline-sm text-headline-sm uppercase">Quick Actions</h3>
            <p className="text-label-md font-label-md text-secondary">Authorized Administrative Commands</p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { icon: 'add_circle', label: 'Register New Voter', to: '/admin/voters' },
              { icon: 'description', label: 'Export Hourly Report', to: '/admin/reports' },
              { icon: 'history', label: 'View System Audit', to: '/admin/audit' },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.to)}
                className="flex items-center justify-between p-4 min-h-12 rounded-lg bg-surface border border-outline-variant shadow-sm hover:bg-on-background hover:text-on-primary hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Icon name={action.icon} />
                  <span className="text-label-md font-label-md">{action.label}</span>
                </div>
                <span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                  <Icon name="chevron_right" />
                </span>
              </button>
            ))}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={election?.isLocked || !canManage}
                title={canManage ? undefined : 'Only Election Committee and Super Admin accounts can lock the election'}
                aria-describedby={canManage ? undefined : 'lock-permission-note'}
                onClick={() => setLockModalOpen(true)}
                className="flex items-center justify-between p-4 min-h-12 rounded-lg bg-error text-on-error shadow-sm hover:brightness-95 hover:shadow-md transition-all group disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-3">
                  <Icon name="emergency" filled />
                  <span className="text-label-md font-label-md font-bold uppercase">
                    {election?.isLocked ? 'Election Locked' : 'Emergency Lock'}
                  </span>
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="lock" />
                </span>
              </button>
              {!canManage && (
                <p id="lock-permission-note" className="text-label-sm font-label-sm text-secondary">
                  Only Election Committee and Super Admin accounts can lock the election.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg border border-outline-variant bg-surface italic text-body-md text-secondary">
            "Transparency is the cornerstone of democracy."
          </div>
        </div>

        <LockReasonModal
          open={lockModalOpen}
          title="Emergency Lock"
          actionLabel="Lock Election"
          minLength={5}
          helperText="This immediately blocks all votes, token changes, voter/candidate edits, and election settings until a Super Admin unlocks it. This action is permanently recorded in the audit log."
          loading={lockElection.isPending}
          onClose={() => setLockModalOpen(false)}
          onConfirm={handleLock}
        />

        <div className="col-span-12 bg-surface border border-outline-variant rounded-xl shadow-sm p-6">
          <h4 className="text-label-md font-label-md uppercase text-secondary mb-4">Recent Activity</h4>
          <div className="text-label-sm font-label-sm space-y-2">
            {isLoading ? (
              <p role="status" className="text-secondary italic">Loading recent activity…</p>
            ) : analytics && analytics.recentActivity.length > 0 ? (
              analytics.recentActivity.map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`} className="text-secondary">
                  <span className="text-on-background font-bold">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                  {describeActivity(entry)}
                </div>
              ))
            ) : (
              <p className="text-secondary italic">No activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
