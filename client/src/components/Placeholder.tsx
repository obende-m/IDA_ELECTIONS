import { Icon } from './ui';

export interface PlaceholderProps {
  icon: string;
  title: string;
  description: string;
}

/** Structural stand-in for screens whose full implementation lands in a later module. */
export function Placeholder({ icon, title, description }: PlaceholderProps) {
  return (
    <section className="flex flex-col items-center justify-center text-center gap-4 rounded-xl border border-dashed border-outline-variant py-24 px-8">
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-surface-container-high">
        <Icon name={icon} size={32} className="text-secondary" />
      </div>
      <h2 className="text-headline-md font-headline-md uppercase">{title}</h2>
      <p className="text-body-md text-secondary max-w-md">{description}</p>
    </section>
  );
}
