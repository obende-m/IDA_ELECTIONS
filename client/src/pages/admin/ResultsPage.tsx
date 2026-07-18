import { Badge, Button, DataTable, Field, Icon, RadialProgress, type DataTableColumn } from '../../components/ui';

const STANDINGS = [
  { name: 'Chief Adebayo Ogundipe', votes: 12402, pct: 48.2, barClass: 'bg-on-background' },
  { name: 'Dr. Chinwe Ezekiel', votes: 9815, pct: 38.1, barClass: 'bg-primary-container' },
  { name: 'Mr. Yusuf Ibrahim', votes: 3520, pct: 13.7, barClass: 'bg-surface-container-highest' },
];

interface WardRow {
  ward: string;
  registered: number;
  actual: number;
  turnout: string;
  leading: string;
  status: 'ACTIVE' | 'CLOSED';
}

const WARDS: WardRow[] = [
  { ward: 'Oshika Ward A', registered: 4200, actual: 3850, turnout: '91.6%', leading: 'Adebayo', status: 'CLOSED' },
  { ward: 'Igarra Central', registered: 8500, actual: 6120, turnout: '72.0%', leading: 'Ezekiel', status: 'ACTIVE' },
  { ward: 'Ugbogbo Ward', registered: 5100, actual: 4015, turnout: '78.7%', leading: 'Adebayo', status: 'ACTIVE' },
  { ward: 'Efe Ward B', registered: 3400, actual: 2890, turnout: '85.0%', leading: 'Yusuf', status: 'CLOSED' },
  { ward: 'Mallam-Pai Ward', registered: 6600, actual: 4862, turnout: '73.6%', leading: 'Ezekiel', status: 'ACTIVE' },
];

/** Ported from live_election_results_admin_portal/code.html; wired to polling/live aggregation in the Live Results module. */
export function ResultsPage() {
  const columns: DataTableColumn<WardRow>[] = [
    { key: 'ward', header: 'Ward Name', render: (r) => <span className="font-bold">{r.ward}</span> },
    { key: 'registered', header: 'Registered', align: 'right', render: (r) => r.registered.toLocaleString() },
    { key: 'actual', header: 'Actual Votes', align: 'right', render: (r) => r.actual.toLocaleString() },
    { key: 'turnout', header: 'Turnout %', align: 'right', render: (r) => r.turnout },
    { key: 'leading', header: 'Leading Candidate', render: (r) => r.leading },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'gold' : 'neutral'}>{r.status}</Badge>,
    },
  ];

  return (
    <>
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-on-background pb-6">
        <div>
          <h1 className="text-headline-xl font-headline-xl uppercase">Live Results</h1>
          <p className="text-label-md font-label-md text-error flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-error inline-block" />
            Real-time Election Analytics — Presidential Election
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" leftIcon="download">Export Report</Button>
          <Button variant="primary" leftIcon="refresh">Refresh Data</Button>
        </div>
      </section>

      <div className="bento-grid">
        <div className="col-span-12 lg:col-span-8 bg-surface border-t-2 border-primary-container border-x border-b border-on-background p-8 flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <h3 className="text-headline-sm font-headline-sm uppercase">Current Standings</h3>
            <Badge variant="gold">Verified Counts</Badge>
          </div>
          <div className="space-y-6">
            {STANDINGS.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-label-md font-label-md uppercase text-secondary">{s.name}</span>
                  <span className="text-headline-sm font-headline-sm">
                    {s.votes.toLocaleString()} Votes ({s.pct}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-container">
                  <div className={`h-full ${s.barClass}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface border border-on-background p-8 flex flex-col items-center gap-4">
            <p className="text-label-md font-label-md uppercase text-secondary tracking-widest">Total Voter Turnout</p>
            <RadialProgress
              value={78.4}
              label={<span className="text-headline-lg font-headline-lg">78.4%</span>}
              sublabel={<span className="text-label-sm font-label-sm text-secondary">of registered</span>}
            />
            <p className="text-label-sm font-label-sm text-secondary">25,737 / 32,800 voted</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-on-background text-on-primary p-4 flex flex-col gap-2">
              <Icon name="timer" className="text-primary-container" />
              <p className="text-label-sm font-label-sm text-primary-container uppercase">Polling Duration</p>
              <p className="text-headline-sm font-headline-sm">06:42:15</p>
            </div>
            <div className="bg-surface border border-on-background p-4 flex flex-col gap-2">
              <Icon name="shield" className="text-primary" />
              <p className="text-label-sm font-label-sm text-secondary uppercase">Encryption</p>
              <p className="text-headline-sm font-headline-sm">AES-256</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 bg-surface border-t-2 border-primary-container border-x border-b border-on-background">
          <div className="flex justify-between items-center p-6 pb-4">
            <h3 className="text-headline-sm font-headline-sm uppercase">Regional Distribution (By Ward)</h3>
            <div className="w-64">
              <Field icon="search" placeholder="Search ward..." aria-label="Search wards" />
            </div>
          </div>
          <DataTable columns={columns} rows={WARDS} rowKey={(r) => r.ward} />
        </div>

        <div className="col-span-12 bg-surface-container border border-on-background p-8 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-headline-sm font-headline-sm uppercase">Live Heatmap</h3>
            <p className="text-label-md font-label-md text-secondary">Spatial Distribution of Voter Density</p>
          </div>
          <div className="h-64 bg-surface-container-high border border-outline-variant flex items-center justify-center">
            <p className="text-label-md font-label-md text-secondary uppercase tracking-widest">
              Ward map visualization renders here once geo data is wired up
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
