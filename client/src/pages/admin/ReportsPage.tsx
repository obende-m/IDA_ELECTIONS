import { useState } from 'react';
import { Button, Card, CardHeader, useToast } from '../../components/ui';
import { reportsApi, type ReportFormat, type ReportType } from '../../features/reports/reportsApi';

const REPORTS: { type: ReportType; title: string; description: string }[] = [
  {
    type: 'summary',
    title: 'Election Summary',
    description: 'Duration, turnout, and full position-by-position results with winners and runners-up.',
  },
  {
    type: 'positions',
    title: 'Position Results',
    description: 'Detailed candidate vote counts and percentages, one section per position.',
  },
  {
    type: 'participation',
    title: 'Participation Report',
    description: 'Registered voters, ballots cast, abstentions, turnout, and hourly voting activity.',
  },
  {
    type: 'audit',
    title: 'Audit Report',
    description: 'Full system audit trail. Individual voter identities are never included.',
  },
];

const FORMATS: { format: ReportFormat; label: string }[] = [
  { format: 'pdf', label: 'PDF' },
  { format: 'xlsx', label: 'Excel' },
  { format: 'csv', label: 'CSV' },
];

export function ReportsPage() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: ReportType, format: ReportFormat) => {
    const key = `${type}-${format}`;
    setDownloading(key);
    try {
      await reportsApi.download(type, format);
    } catch (err) {
      toast({ title: 'Could not generate report', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Reports</h1>
        <p className="text-body-lg text-secondary">Generate and export election summary, results, and audit reports.</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {REPORTS.map((report) => (
          <Card key={report.type} accent className="p-8 flex flex-col gap-4">
            <CardHeader>
              <h3 className="text-headline-sm font-headline-sm uppercase">{report.title}</h3>
            </CardHeader>
            <p className="text-body-md text-secondary flex-1">{report.description}</p>
            <div className="flex flex-wrap gap-3">
              {FORMATS.map(({ format, label }) => (
                <Button
                  key={format}
                  variant="secondary"
                  size="sm"
                  leftIcon="download"
                  loading={downloading === `${report.type}-${format}`}
                  onClick={() => handleDownload(report.type, format)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
