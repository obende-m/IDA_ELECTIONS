import { useState } from 'react';
import { Icon, PageHeader, useToast } from '../../components/ui';
import { reportsApi, type ReportFormat, type ReportType } from '../../features/reports/reportsApi';
import { cn } from '../../lib/cn';

const REPORTS: { type: ReportType; title: string; description: string; icon: string }[] = [
  { type: 'summary', title: 'Election summary', description: 'Duration, turnout and position-by-position results with leading candidates.', icon: 'description' },
  { type: 'positions', title: 'Position results', description: 'Candidate vote counts and percentages, one section per contest.', icon: 'analytics' },
  { type: 'participation', title: 'Participation', description: 'Registered voters, ballots cast, abstentions, turnout and hourly activity.', icon: 'groups' },
  { type: 'audit', title: 'Audit trail', description: 'The full administrative audit trail. Individual voter identities are never included.', icon: 'security' },
];

const FORMATS: { format: ReportFormat; label: string; hint: string }[] = [
  { format: 'pdf', label: 'PDF', hint: 'To print or share' },
  { format: 'xlsx', label: 'Excel', hint: 'For analysis' },
  { format: 'csv', label: 'CSV', hint: 'Raw data' },
];

/** Report catalogue as an editorial ruled list: each report, its purpose, and its export formats. */
export function ReportsPage() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (type: ReportType, format: ReportFormat) => {
    const key = `${type}-${format}`;
    setDownloading(key);
    try {
      await reportsApi.download(type, format);
      toast({ title: 'Report downloaded', description: `${REPORTS.find((r) => r.type === type)?.title} (${format.toUpperCase()})`, variant: 'success', durationMs: 3000 });
    } catch (err) {
      toast({ title: 'Could not generate report', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <PageHeader kicker="Oversight" title="Reports" description="Generate official exports. Every download is recorded in the audit trail." />
      <ol className="border-t border-on-background">
        {REPORTS.map((r, i) => (
          <li key={r.type} className="animate-rise grid gap-5 lg:grid-cols-[3rem_1fr_auto] items-center py-7 border-b border-outline-variant" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="hidden lg:flex w-11 h-11 rounded-xl bg-surface-container-low text-primary items-center justify-center">
              <Icon name={r.icon} size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-[1.625rem] leading-tight">{r.title}</h2>
              <p className="mt-1 text-body-md text-secondary max-w-xl">{r.description}</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Download ${r.title}`}>
              {FORMATS.map(({ format, label, hint }) => {
                const busy = downloading === `${r.type}-${format}`;
                return (
                  <button
                    key={format}
                    type="button"
                    disabled={!!downloading}
                    onClick={() => download(r.type, format)}
                    aria-label={`Download ${r.title} as ${label}`}
                    className={cn(
                      'group h-14 min-w-[7.5rem] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-left flex items-center justify-between gap-3',
                      'hover:border-on-background transition-colors disabled:opacity-50'
                    )}
                  >
                    <span>
                      <span className="block font-medium text-[0.875rem]">{label}</span>
                      <span className="block text-[0.6875rem] text-secondary">{hint}</span>
                    </span>
                    {busy ? (
                      <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
                    ) : (
                      <Icon name="download" size={16} className="text-secondary group-hover:text-on-background transition-transform group-hover:translate-y-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
