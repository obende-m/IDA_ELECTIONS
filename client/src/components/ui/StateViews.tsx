import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Icon } from './Icon';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-6 w-6 animate-spin text-primary', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface LoadingStateProps {
  label?: string;
  hint?: ReactNode;
  className?: string;
}

/** Centered spinner + label announced politely to screen readers. */
export function LoadingState({ label = 'Loading…', hint, className }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <Spinner className="h-8 w-8" />
      <p className="text-label-md font-label-md uppercase tracking-widest text-secondary">{label}</p>
      {hint && <p className="text-body-md text-secondary max-w-sm">{hint}</p>}
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

/** Error panel with an optional Retry action. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this information. Check your connection and try again.',
  onRetry,
  retrying,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-6 py-12 text-center', className)}
    >
      <Icon name="error" filled size={32} className="text-error" />
      <h2 className="text-headline-sm font-headline-sm uppercase">{title}</h2>
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
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
        <Icon name={icon} size={28} className="text-secondary" />
      </div>
      <h2 className="text-headline-sm font-headline-sm">{title}</h2>
      {description && <p className="text-body-md text-secondary max-w-md">{description}</p>}
      {action}
    </div>
  );
}

/** Turns an unknown thrown value into a user-facing message. */
export function errorMessage(err: unknown, fallback?: string): string | undefined {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Inline error shown inside a form after a failed submit. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-label-md font-label-md text-error">
      {message}
    </p>
  );
}
