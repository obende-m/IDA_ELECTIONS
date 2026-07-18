import { useState } from 'react';
import { StatCard, StatusPill, Icon, SelectField, useToast } from '../../components/ui';
import { useCurrentElection, useLockElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import { LockReasonModal } from '../../features/elections/LockReasonModal';
import { useAnalytics } from '../../features/analytics/useAnalytics';
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
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const { data: analytics } = useAnalytics();
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const lockElection = useLockElection();

  const handleLock = async (reason: string) => {
    await lockElection.mutateAsync(reason);
    toast({ title: 'Election locked', description: 'No further changes can be made until a Super Admin unlocks it.', variant: 'success' });
    setLockModalOpen(false);
  };

  const maxHourly = Math.max(1, ...(analytics?.timeline.map((t) => t.ballotsCast) ?? [0]));

  return (
    <>
      {election && <LockBanner election={election} />}

      <section className="flex flex-col md:flex-row justify-between items-end border-b-2 border-on-background pb-6">
        <div>
          <h1 className="font-headline-xl text-headline-xl uppercase">Dashboard</h1>
          <p className="font-body-lg text-body-lg text-secondary">Real-time election participation monitoring.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill
            label={`Election Status: ${election?.status ?? '—'}`}
            live={election?.status === 'ACTIVE'}
          />
          <div className="text-headline-sm font-headline-sm text-on-background tracking-tighter">
            Time Remaining: {formatTimeRemaining(analytics?.election.endTime ?? null)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard label="Registered Voters" value={(analytics?.registeredVoters ?? 0).toLocaleString()} icon="group_add" helpText="Total in this election" />
        <StatCard label="Ballots Cast" value={(analytics?.ballotsCast ?? 0).toLocaleString()} icon="how_to_vote" helpText="Verified submissions" />
        <StatCard
          label="Turnout %"
          value={
            <>
              <span>{(analytics?.turnoutPct ?? 0).toFixed(1)}%</span>
              <div className="w-full h-2 bg-surface-container mt-2">
                <div className="h-full bg-primary" style={{ width: `${analytics?.turnoutPct ?? 0}%` }} />
              </div>
            </>
          }
          icon="percent"
        />
        <StatCard label="Time Remaining" value={formatTimeRemaining(analytics?.election.endTime ?? null)} icon="timer" helpText="Until polls close" inverse />
      </section>

      <div className="bento-grid">
        <div className="col-span-12 lg:col-span-8 bg-surface border border-on-background p-8 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline-sm text-headline-sm uppercase">Live Voting Activity</h3>
              <p className="text-label-md font-label-md text-secondary">Hourly voting volume since the election opened</p>
            </div>
            <SelectField aria-label="Time range" defaultValue="realtime" className="mb-0">
              <option value="realtime">Real-time (Auto)</option>
            </SelectField>
          </div>
          {analytics && analytics.timeline.length > 0 ? (
            <>
              <div className="relative h-64 w-full bg-surface-container flex items-end justify-between px-8 py-4 border border-outline-variant overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />
                {analytics.timeline.map((point) => (
                  <div
                    key={point.hourBucket}
                    className="w-12 relative group bg-on-background"
                    style={{ height: `${Math.max(4, (point.ballotsCast / maxHourly) * 100)}%` }}
                  >
                    <div className="absolute -top-8 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity text-label-sm font-bold">
                      {point.ballotsCast}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-8 text-label-sm font-label-sm text-secondary uppercase tracking-widest">
                {analytics.timeline.map((point) => (
                  <span key={point.hourBucket}>
                    {new Date(point.hourBucket).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 w-full bg-surface-container border border-outline-variant flex items-center justify-center">
              <p className="text-label-md font-label-md text-secondary uppercase tracking-widest">No voting activity yet</p>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 bg-surface-container border border-on-background p-8 flex flex-col gap-6">
          <div className="border-b-2 border-primary pb-4">
            <h3 className="font-headline-sm text-headline-sm uppercase">Quick Actions</h3>
            <p className="text-label-md font-label-md text-secondary">Authorized Administrative Commands</p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { icon: 'add_circle', label: 'Register New Voter' },
              { icon: 'description', label: 'Export Hourly Report' },
              { icon: 'history', label: 'View System Audit' },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center justify-between p-4 bg-surface border border-on-background hover:bg-on-background hover:text-on-primary transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Icon name={action.icon} />
                  <span className="text-label-md font-label-md">{action.label}</span>
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="chevron_right" />
                </span>
              </button>
            ))}
            <button
              disabled={election?.isLocked}
              onClick={() => setLockModalOpen(true)}
              className="flex items-center justify-between p-4 bg-error text-on-error border border-error hover:bg-transparent hover:text-error transition-all group disabled:opacity-50 disabled:pointer-events-none"
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
          </div>
          <div className="mt-4 p-4 border border-outline-variant bg-surface italic text-body-md text-secondary">
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

        <div className="col-span-12 bg-surface border border-on-background p-6">
          <h4 className="text-label-md font-label-md uppercase text-secondary mb-4">Recent Activity</h4>
          <div className="text-label-sm font-label-sm space-y-2">
            {analytics && analytics.recentActivity.length > 0 ? (
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
