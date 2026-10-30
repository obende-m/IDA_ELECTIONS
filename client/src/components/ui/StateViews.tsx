import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Icon } from './Icon';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-5 w-5 animate-spin text-primary', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton h-4', className)} style={style} aria-hidden="true" />;
}

export interface LoadingStateProps {
  label?: string;
  hint?: ReactNode;
  className?: string;
}

export function LoadingState({ label = 'Loading…', hint, className }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center animate-fade', className)}>
      <Spinner className="h-7 w-7" />
      <p className="eyebrow">{label}</p>
      {hint && <p className="text-body-md text-secondary max-w-sm">{hint}</p>}
    </div>
  );
}

/** Page-level skeleton: a header block and a few content rows, matching admin page rhythm. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this information. Check your connection and try again.',
  onRetry,
  retrying,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-error/25 bg-error-container/40 px-6 py-12 text-center animate-fade', className)}>
      <span className="w-11 h-11 rounded-full bg-surface-container-lowest flex items-center justify-center text-error">
        <Icon name="error" size={22} />
      </span>
      <h2 className="font-serif text-[1.375rem] leading-tight">{title}</h2>
      <p className="text-body-md text-secondary max-w-md">{message}</p>
      {onRetry && (
        <Button variant="secondary" leftIcon="refresh" loading={retrying} onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center animate-fade', className)}>
      <span className="w-12 h-12 rounded-full border border-dashed border-outline flex items-center justify-center text-secondary">
        <Icon name={icon} size={22} />
      </span>
      <h2 className="font-serif text-[1.375rem] leading-tight">{title}</h2>
      {description && <p className="text-body-md text-secondary max-w-md">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function errorMessage(err: unknown, fallback?: string): string | undefined {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-error-container/60 border border-error/20 px-3 py-2.5 text-[0.875rem] text-on-error-container">
      <Icon name="error" size={16} className="mt-0.5" />
      {message}
    </p>
  );
}

/** Admin page heading: mono kicker, large serif title, supporting line, actions on the right. */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-5 md:flex-row md:items-end md:justify-between pb-6 border-b border-outline-variant animate-rise', className)}>
      <div className="min-w-0">
        {kicker && <p className="eyebrow mb-2.5">{kicker}</p>}
        <h1 className="font-serif text-headline-xl text-on-background">{title}</h1>
        {description && <p className="mt-2.5 text-body-lg text-secondary max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </header>
  );
}

/** Underlined tab strip (keyboard: arrow keys move between tabs). */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-6 overflow-x-auto no-scrollbar border-b border-outline-variant', className)}>
      {items.map((item, idx) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const next = items[(idx + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length];
              onChange(next.value);
              (e.currentTarget.parentElement?.children[items.indexOf(next)] as HTMLElement | undefined)?.focus();
            }}
            className={cn(
              'relative h-11 shrink-0 text-[0.875rem] font-medium transition-colors',
              selected ? 'text-on-background' : 'text-secondary hover:text-on-background',
              'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:transition-transform after:duration-300 after:origin-left',
              selected ? 'after:bg-primary after:scale-x-100' : 'after:bg-primary after:scale-x-0'
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="ml-1.5 font-mono text-[0.75rem] text-secondary tabular">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
