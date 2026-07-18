import { Placeholder } from '../../components/Placeholder';

export function AuditPage() {
  return (
    <>
      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Audit Logs</h1>
        <p className="text-body-lg text-secondary">Searchable trail of every security-relevant system action.</p>
      </section>
      <Placeholder
        icon="security"
        title="Audit Log Viewer"
        description="The searchable, filterable audit trail ships in the Audit Log Viewer & Settings module."
      />
    </>
  );
}
