import { Placeholder } from '../../components/Placeholder';

export function PositionsPage() {
  return (
    <>
      <section className="border-b-2 border-on-background pb-6">
        <h1 className="text-headline-xl font-headline-xl uppercase">Positions</h1>
        <p className="text-body-lg text-secondary">Configure ballot positions, display order, and max selections.</p>
      </section>
      <Placeholder
        icon="list_alt"
        title="Position Management"
        description="Position creation, ordering, and candidate assignment ship in the Election / Position / Candidate Management module."
      />
    </>
  );
}
