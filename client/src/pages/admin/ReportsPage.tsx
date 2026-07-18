import { Placeholder } from '../../components/Placeholder';

export function ReportsPage() {
  return (
    <>
      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Reports</h1>
        <p className="text-body-lg text-secondary">Generate and export election summary, results, and audit reports.</p>
      </section>
      <Placeholder
        icon="description"
        title="Reports & Exports"
        description="PDF, Excel, and CSV report generation ships in the Reports & Exports module."
      />
    </>
  );
}
