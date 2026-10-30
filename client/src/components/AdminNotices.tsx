import type { ReactNode } from 'react';
import { Icon } from './ui';

/** Shown in place of a page the current role may not use (the server enforces the same rule). */
export function RestrictedNotice({ title = 'Access restricted', children }: { title?: string; children: ReactNode }) {
  return (
    <section className="animate-rise rounded-2xl border border-outline-variant bg-surface-container-lowest px-6 py-20 text-center flex flex-col items-center">
      <span className="w-12 h-12 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center mb-5">
        <Icon name="lock" size={22} />
      </span>
      <h1 className="font-serif text-headline-lg">{title}</h1>
      <p className="mt-2 text-body-md text-secondary max-w-md">{children}</p>
    </section>
  );
}

/** Ink callout for sensitive-data notices (privacy, audit). */
export function SensitiveNote({ icon = 'security', children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-on-background text-on-primary px-5 py-4">
      <span className="w-8 h-8 rounded-lg bg-white/10 text-primary-fixed-dim flex items-center justify-center shrink-0">
        <Icon name={icon} size={16} />
      </span>
      <p className="text-[0.875rem] text-on-primary/80 leading-relaxed">{children}</p>
    </div>
  );
}
