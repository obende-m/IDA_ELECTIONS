import { useState } from 'react';
import { StatCard, StatusPill, Icon, SelectField, useToast } from '../../components/ui';
import { useCurrentElection, useLockElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import { LockReasonModal } from '../../features/elections/LockReasonModal';

const HOURLY_ACTIVITY = [
  { time: '08:00 AM', value: 120, height: '25%' },
  { time: '', value: 450, height: '40%' },
  { time: '10:00 AM', value: 890, height: '60%' },
  { time: '', value: 1240, height: '83%', accent: true },
  { time: '12:00 PM', value: 1100, height: '80%' },
  { time: '', value: 950, height: '75%' },
  { time: '02:00 PM', value: 820, height: '66%' },
  { time: '04:00 PM', value: 600, height: '50%' },
];

const WARD_LEADERBOARD = [
  { ward: 'Ward 01 - Okore', turnout: '88% Turnout' },
  { ward: 'Ward 04 - Udama', turnout: '76% Turnout' },
  { ward: 'Ward 11 - Somorika', turnout: '72% Turnout' },
];

const SYSTEM_HEALTH = ['Cloud Nodes: 12/12 Online', 'Encryption Level: AES-256', 'Database Replication: Confirmed'];

const RECENT_AUDIT = [
  { time: '14:22:04', text: 'Voter #ID8829 validated successfully.' },
  { time: '14:21:48', text: 'Admin session extended (Admin_Root_01).' },
  { time: '14:21:30', text: 'Bulk export initiated by Regional Head.' },
];

const QUICK_ACTIONS = [
  { icon: 'add_circle', label: 'Register New Voter' },
  { icon: 'description', label: 'Export Hourly Report' },
  { icon: 'history', label: 'View System Audit' },
];

/** Ported from admin_dashboard_ida_election_portal/code.html. Metrics are placeholder data until Module 5 wires live aggregation. */
export function DashboardPage() {
  const { toast } = useToast();
  const { data } = useCurrentElection();
  const election = data?.election;
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const lockElection = useLockElection();

  const handleLock = async (reason: string) => {
    await lockElection.mutateAsync(reason);
    toast({ title: 'Election locked', description: 'No further changes can be made until a Super Admin unlocks it.', variant: 'success' });
    setLockModalOpen(false);
  };

  return (
    <>
      {election && <LockBanner election={election} />}

      <section className="flex flex-col md:flex-row justify-between items-end border-b-2 border-on-background pb-6">
        <div>
          <h1 className="font-headline-xl text-headline-xl uppercase">Dashboard</h1>
          <p className="font-body-lg text-body-lg text-secondary">Monitoring real-time participation across 12 wards.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill
            label={`Election Status: ${election?.status ?? '—'}`}
            live={election?.status === 'ACTIVE'}
          />
          <div className="text-headline-sm font-headline-sm text-on-background tracking-tighter">Polls Close: 06:00 PM GMT</div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard label="Registered Voters" value="12,458" icon="group_add" helpText="+2.4% from last hour" />
        <StatCard label="Votes Cast" value="8,294" icon="how_to_vote" helpText="Total verified ballots" />
        <StatCard
          label="Turnout %"
          value={
            <>
              <span>66.5%</span>
              <div className="w-full h-2 bg-surface-container mt-2">
                <div className="h-full bg-primary" style={{ width: '66.5%' }} />
              </div>
            </>
          }
          icon="percent"
        />
        <StatCard label="Time Remaining" value="04:22:12" icon="timer" helpText="System locked at 18:00" inverse />
      </section>

      <div className="bento-grid">
        <div className="col-span-12 lg:col-span-8 bg-surface border border-on-background p-8 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline-sm text-headline-sm uppercase">Live Voting Activity</h3>
              <p className="text-label-md font-label-md text-secondary">Hourly voting volume across all digital channels</p>
            </div>
            <SelectField aria-label="Time range" defaultValue="realtime" className="mb-0">
              <option value="realtime">Real-time (Auto)</option>
              <option value="6h">Past 6 Hours</option>
              <option value="day">All Day</option>
            </SelectField>
          </div>
          <div className="relative h-64 w-full bg-surface-container flex items-end justify-between px-8 py-4 border border-outline-variant overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {HOURLY_ACTIVITY.map((bar, i) => (
              <div
                key={i}
                className={`w-12 relative group ${bar.accent ? 'bg-primary' : 'bg-on-background'}`}
                style={{ height: bar.height }}
              >
                <div className="absolute -top-8 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity text-label-sm font-bold">
                  {bar.value}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-8 text-label-sm font-label-sm text-secondary uppercase tracking-widest">
            {HOURLY_ACTIVITY.filter((b) => b.time).map((b) => (
              <span key={b.time}>{b.time}</span>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-surface-container border border-on-background p-8 flex flex-col gap-6">
          <div className="border-b-2 border-primary pb-4">
            <h3 className="font-headline-sm text-headline-sm uppercase">Quick Actions</h3>
            <p className="text-label-md font-label-md text-secondary">Authorized Administrative Commands</p>
          </div>
          <div className="flex flex-col gap-4">
            {QUICK_ACTIONS.map((action) => (
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

        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-on-background p-6">
            <h4 className="text-label-md font-label-md uppercase text-secondary mb-4">Ward Leaderboard</h4>
            <div className="space-y-3">
              {WARD_LEADERBOARD.map((w) => (
                <div key={w.ward} className="flex justify-between items-center border-b border-surface-container-high pb-2">
                  <span className="text-body-md">{w.ward}</span>
                  <span className="text-label-md font-bold">{w.turnout}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface border border-on-background p-6">
            <h4 className="text-label-md font-label-md uppercase text-secondary mb-4">System Health</h4>
            <div className="space-y-4">
              {SYSTEM_HEALTH.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-body-md">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface border border-on-background p-6">
            <h4 className="text-label-md font-label-md uppercase text-secondary mb-4">Recent Audit Log</h4>
            <div className="text-label-sm font-label-sm space-y-2">
              {RECENT_AUDIT.map((entry) => (
                <div key={entry.time} className="text-secondary">
                  <span className="text-on-background font-bold">[{entry.time}]</span> {entry.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
