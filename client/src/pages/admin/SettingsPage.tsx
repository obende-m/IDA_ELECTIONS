import { Placeholder } from '../../components/Placeholder';

export function SettingsPage() {
  return (
    <>
      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Settings</h1>
        <p className="text-body-lg text-secondary">Election lifecycle configuration and system preferences.</p>
      </section>
      <Placeholder
        icon="settings"
        title="Election Settings"
        description="Election lifecycle controls (draft / active / paused / closed / archived) ship alongside the Election Management module."
      />
    </>
  );
}
