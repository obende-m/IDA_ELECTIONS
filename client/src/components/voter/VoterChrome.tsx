import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Brand } from '../Brand';
import { Icon } from '../ui';

export type VoterStep = 'verify' | 'ballot' | 'review' | 'done';
const STEPS: { key: VoterStep; label: string }[] = [
  { key: 'verify', label: 'Confirm identity' },
  { key: 'ballot', label: 'Mark ballot' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Receipt' },
];

/** Four-step indicator. Announces "Step x of 4" for screen readers. */
export function StepIndicator({ step, className }: { step: VoterStep; className?: string }) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <nav aria-label="Voting progress" className={cn('w-full', className)}>
      <p className="sr-only">
        Step {idx + 1} of {STEPS.length}: {STEPS[idx].label}
      </p>
      <ol className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <li key={s.key} className="min-w-0">
            <div className={cn('h-1 rounded-full transition-colors duration-500', i <= idx ? 'bg-primary' : 'bg-surface-container-high')} />
            <span className={cn('mt-1.5 hidden sm:block font-mono text-[0.625rem] uppercase tracking-[0.08em] truncate', i === idx ? 'text-on-background' : 'text-secondary')}>
              {s.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Voter page frame: sticky brand header (+ optional step indicator), centred content column, quiet footer. */
export function VoterShell({
  step,
  children,
  headerRight,
  footer = true,
  width = 'md',
}: {
  step?: VoterStep;
  children: ReactNode;
  headerRight?: ReactNode;
  footer?: boolean;
  width?: 'md' | 'lg';
}) {
  return (
    <>
      <header className="no-print sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-outline-variant">
        <div className={cn('mx-auto px-5 sm:px-8', width === 'lg' ? 'max-w-5xl' : 'max-w-2xl')}>
          <div className="h-16 flex items-center justify-between gap-4">
            <Link to="/vote" aria-label="IDA Election Portal home" className="rounded-lg">
              <Brand subtitle="Election Portal" />
            </Link>
            {headerRight ?? (
              <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-secondary">
                <Icon name="lock" size={13} />
                <span className="hidden sm:inline">Secure connection</span>
              </span>
            )}
          </div>
          {step && <StepIndicator step={step} className="pb-3" />}
        </div>
      </header>
      <main id="main" className={cn('flex-1 w-full mx-auto px-5 sm:px-8 py-8 sm:py-12', width === 'lg' ? 'max-w-5xl' : 'max-w-2xl')}>
        {children}
      </main>
      {footer && <VoterFooter />}
    </>
  );
}

export function VoterFooter() {
  return (
    <footer className="no-print border-t border-outline-variant">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row gap-2 justify-between text-[0.75rem] text-secondary">
        <p>© {new Date().getFullYear()} Igarra Development Association · Electoral Committee</p>
        <p>Need help? Contact the Electoral Committee — never share your voting link.</p>
      </div>
    </footer>
  );
}

/** Full-screen status message (closed, link required, link unavailable…). */
export function StatusScreen({
  icon,
  tone = 'neutral',
  kicker,
  title,
  children,
  aside,
  action,
}: {
  icon: string;
  tone?: 'neutral' | 'error' | 'success';
  kicker?: string;
  title: string;
  children?: ReactNode;
  aside?: { title: string; body: ReactNode };
  action?: ReactNode;
}) {
  const toneClass = tone === 'error' ? 'bg-error-container text-error' : tone === 'success' ? 'bg-success-soft text-success' : 'bg-surface-container text-on-surface-variant';
  return (
    <VoterShell>
      <div role={tone === 'error' ? 'alert' : undefined} className="animate-rise min-h-[55vh] flex flex-col justify-center">
        <span className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-8', toneClass)}>
          <Icon name={icon} size={26} />
        </span>
        {kicker && <p className="eyebrow mb-3">{kicker}</p>}
        <h1 className="font-serif text-headline-xl max-w-xl">{title}</h1>
        {children && <div className="mt-4 text-body-lg text-secondary max-w-xl">{children}</div>}
        {action && <div className="mt-8">{action}</div>}
        {aside && (
          <div className="mt-12 pt-6 border-t border-outline-variant max-w-xl">
            <p className="eyebrow mb-2">{aside.title}</p>
            <div className="text-body-md text-on-surface-variant">{aside.body}</div>
          </div>
        )}
      </div>
    </VoterShell>
  );
}
