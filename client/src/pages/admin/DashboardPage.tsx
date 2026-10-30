import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, ElectionStatusBadge, Icon, ProgressBar, Skeleton, StatCard, useToast } from '../../components/ui';
import { useCurrentElection, useLockElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import { LockReasonModal } from '../../features/elections/LockReasonModal';
import { LinksCard } from '../../components/LinksCard';
import { useAnalytics } from '../../features/analytics/useAnalytics';
import { useAuth } from '../../features/auth/AuthContext';
import { canManageElection } from '../../features/auth/permissions';
import type { RecentActivityEntry, TimelinePoint } from '../../features/analytics/types';

const ACTIVITY: Record<string, { text: string; icon: string }> = {
  VOTE_CAST: { text: 'Ballot submitted', icon: 'how_to_vote' },
  TOKEN_ISSUED: { text: 'Voting link issued', icon: 'link' },
  TOKEN_REPLACEMENT_ISSUED: { text: 'Voting link reissued', icon: 'refresh' },
  VOTER_IMPORT_COMPLETED: { text: 'Voter roster imported', icon: 'upload_file' },
  ELECTION_OPENED: { text: 'Election opened', icon: 'lock_open' },
  ELECTION_PAUSED: { text: 'Election paused', icon: 'schedule' },
  ELECTION_RESUMED: { text: 'Election resumed', icon: 'lock_open' },
  ELECTION_CLOSED: { text: 'Election closed', icon: 'lock' },
  ELECTION_LOCKED: { text: 'Election locked', icon: 'lock' },
  ELECTION_UNLOCKED: { text: 'Election unlocked', icon: 'lock_open' },
};

function countdown(endTime: string | null, status?: string) {
  if (!endTime) return { value: '—', help: 'No closing time set' };
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return { value: '00:00:00', help: status === 'CLOSED' ? 'Polls have closed' : 'Closing time reached' };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
  return { value: d > 0 ? `${d}d ${hms.slice(0, 5)}` : hms, help: `Closes ${new Date(endTime).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` };
}

function relTime(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Hourly activity as a thin-bar column chart with a cumulative-turnout line overlay. */
function ActivityChart({ points, registered }: { points: TimelinePoint[]; registered: number }) {
  const max = Math.max(1, ...points.map((p) => p.ballotsCast));
  const W = 100;
  const H = 100;
  const step = W / Math.max(points.length, 1);
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i + 0.5) * step},${H - Math.min(100, p.cumulativeTurnoutPct)}`)
    .join(' ');
  const label = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric' });
  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`Ballots per hour: ${points.map((p) => `${label(p.hourBucket)} ${p.ballotsCast}`).join(', ')}. Cumulative turnout ${points.at(-1)?.cumulativeTurnoutPct ?? 0}% of ${registered} voters.`}
        className="relative h-60"
      >
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-dashed border-outline-variant" />
          ))}
        </div>
        <div className="absolute inset-0 flex items-end gap-[3%] px-1">
          {points.map((p, i) => (
            <div key={p.hourBucket} className="group relative flex-1 h-full flex items-end justify-center" style={{ ['--i' as string]: i }}>
              <div
                className="w-full max-w-10 rounded-t-[3px] bg-on-background group-hover:bg-primary transition-colors origin-bottom animate-rise"
                style={{ height: `${Math.max(3, (p.ballotsCast / max) * 100)}%`, animationDelay: `${i * 40}ms` }}
              />
              <span className="pointer-events-none absolute -top-1 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-on-background text-on-primary px-2 py-1 text-[0.75rem] whitespace-nowrap tabular">
                {p.ballotsCast} ballots · {label(p.hourBucket)}
              </span>
            </div>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <path d={line} fill="none" stroke="var(--color-primary-container)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-2 flex gap-[3%] px-1" aria-hidden="true">
        {points.map((p) => (
          <span key={p.hourBucket} className="flex-1 text-center font-mono text-[0.625rem] text-secondary uppercase truncate">
            {label(p.hourBucket)}
          </span>
        ))}
      </div>
      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.75rem] text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-on-background" /> Ballots per hour
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-[2px] bg-primary-container" /> Cumulative turnout
        </span>
      </figcaption>
    </figure>
  );
}

export function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = canManageElection(user?.role);
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const { data: analytics, isLoading, isError, error, refetch, isFetching } = useAnalytics();
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const lockElection = useLockElection();

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

  const cd = countdown(endTime, analytics?.election.status);
  const fmt = (n?: number) => (n === undefined ? '—' : n.toLocaleString());

  return (
    <>
      {election && <LockBanner election={election} />}

      {isError && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-error/25 bg-error-container/50 px-4 py-3">
          <p className="text-[0.875rem] text-on-error-container">
            {analytics ? 'Could not refresh live figures — showing the last data received.' : `Could not load election statistics. ${error instanceof Error ? error.message : ''}`}
          </p>
          <Button variant="secondary" size="sm" leftIcon="refresh" loading={isFetching} onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Editorial hero */}
      <section className="animate-rise grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end pb-8 border-b border-outline-variant">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="eyebrow">Election overview · {analytics?.election.year ?? election?.year ?? '—'}</span>
            {election && <ElectionStatusBadge status={election.status} locked={election.isLocked} />}
          </div>
          <h1 className="font-serif text-display text-on-background max-w-4xl">{analytics?.election.title ?? election?.title ?? 'Election'}</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/admin/results" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-primary text-on-primary text-[0.875rem] font-medium hover:bg-primary-hover transition-colors">
            View results <Icon name="arrow_forward" size={16} />
          </Link>
          <Link to="/admin/voters" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-outline-variant bg-surface-container-lowest text-[0.875rem] font-medium hover:border-outline transition-colors">
            Manage voters
          </Link>
        </div>
      </section>

      <section aria-busy={isLoading} className="stagger grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Registered voters" value={fmt(analytics?.registeredVoters)} icon="groups" helpText="On the roll for this election" />
        <StatCard label="Ballots cast" value={fmt(analytics?.ballotsCast)} icon="how_to_vote" helpText={analytics ? `${fmt(analytics.abstainedVoters)} yet to vote` : 'Verified submissions'} />
        <StatCard label="Turnout" value={analytics ? `${analytics.turnoutPct.toFixed(1)}%` : '—'} icon="percent">
          <ProgressBar value={analytics?.turnoutPct ?? 0} label="Turnout" className="mt-2" />
        </StatCard>
        <StatCard label="Time remaining" value={cd.value} icon="timer" helpText={cd.help} inverse />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle kicker="Participation">Voting activity</CardTitle>
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-secondary">
              <span className="live-dot text-success" aria-hidden="true" /> Live · refreshes every 10 s
            </span>
          </CardHeader>
          <div className="p-5 sm:p-6">
            {isLoading ? (
              <Skeleton className="h-60 rounded-lg" />
            ) : analytics && analytics.timeline.length > 0 ? (
              <ActivityChart points={analytics.timeline} registered={analytics.registeredVoters} />
            ) : (
              <div className="h-60 rounded-lg border border-dashed border-outline-variant flex flex-col items-center justify-center gap-2 text-secondary">
                <Icon name="how_to_vote" size={24} />
                <p className="text-[0.875rem]">No ballots yet. Activity appears here as soon as voting starts.</p>
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <LinksCard links={analytics?.links} />

          <Card>
            <CardHeader>
              <CardTitle kicker="Shortcuts">Next steps</CardTitle>
            </CardHeader>
            <ul className="ruled">
              {[
                { icon: 'group_add', label: 'Register or import voters', to: '/admin/voters' },
                { icon: 'list_alt', label: 'Review the ballot', to: '/admin/positions' },
                { icon: 'description', label: 'Download reports', to: '/admin/reports' },
                { icon: 'security', label: 'Open the audit trail', to: '/admin/audit' },
              ].map((a) => (
                <li key={a.to}>
                  <Link to={a.to} className="group flex items-center gap-3 px-5 sm:px-6 h-14 text-[0.9rem] hover:bg-surface-bright transition-colors">
                    <Icon name={a.icon} size={18} className="text-secondary group-hover:text-primary" />
                    <span className="flex-1">{a.label}</span>
                    <Icon name="arrow_forward" size={16} className="text-outline transition-transform group-hover:translate-x-0.5 group-hover:text-on-background" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">
                <Icon name="emergency" size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-[0.9375rem]">Emergency lock</p>
                <p className="mt-1 text-[0.8125rem] text-secondary">Immediately freezes voting and all record changes. Only a Super Admin can unlock.</p>
              </div>
            </div>
            <Button
              variant="danger"
              fullWidth
              className="mt-4"
              leftIcon="lock"
              disabled={election?.isLocked || !canManage}
              aria-describedby={canManage ? undefined : 'lock-permission-note'}
              onClick={() => setLockModalOpen(true)}
            >
              {election?.isLocked ? 'Election is locked' : 'Lock election'}
            </Button>
            {!canManage && (
              <p id="lock-permission-note" className="mt-2 text-[0.75rem] text-secondary">
                Requires an Election Committee or Super Admin account.
              </p>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle kicker="Audit-logged">Recent activity</CardTitle>
          <Link to="/admin/audit" className="text-[0.8125rem] font-medium text-primary hover:underline underline-offset-4">
            Full audit trail
          </Link>
        </CardHeader>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </div>
        ) : analytics && analytics.recentActivity.length > 0 ? (
          <ol className="ruled">
            {analytics.recentActivity.map((entry: RecentActivityEntry, i) => {
              const meta = ACTIVITY[entry.action] ?? { text: entry.action.replace(/_/g, ' ').toLowerCase(), icon: 'info' };
              return (
                <li key={`${entry.timestamp}-${i}`} className="flex items-center gap-4 px-5 sm:px-6 py-3">
                  <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
                    <Icon name={meta.icon} size={15} />
                  </span>
                  <p className="flex-1 min-w-0 text-[0.875rem]">
                    {meta.text}
                    {entry.actorName && <span className="text-secondary"> · {entry.actorName}</span>}
                  </p>
                  <time dateTime={entry.timestamp} title={new Date(entry.timestamp).toLocaleString()} className="font-mono text-[0.6875rem] uppercase text-secondary whitespace-nowrap">
                    {relTime(entry.timestamp)}
                  </time>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-6 py-10 text-center text-[0.875rem] text-secondary">No activity recorded yet.</p>
        )}
      </Card>

      <LockReasonModal
        open={lockModalOpen}
        title="Emergency lock"
        actionLabel="Lock election"
        minLength={5}
        helperText="This immediately blocks all votes, link changes, voter/candidate edits and election settings until a Super Admin unlocks it. The action and your reason are permanently recorded in the audit log."
        loading={lockElection.isPending}
        onClose={() => setLockModalOpen(false)}
        onConfirm={handleLock}
      />
    </>
  );
}
