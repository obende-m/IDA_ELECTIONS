import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export type BadgeVariant = 'gold' | 'neutral' | 'success' | 'error' | 'outline' | 'warning' | 'teal';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: string;
  /** Leading status dot (pulsing when `live`). */
  dot?: boolean;
  live?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  gold: 'bg-primary-fixed text-on-primary-container border-primary-fixed-dim/60',
  neutral: 'bg-surface-container text-on-surface-variant border-outline-variant',
  success: 'bg-success-soft text-success border-success/20',
  error: 'bg-error-container text-on-error-container border-error/20',
  outline: 'bg-transparent text-on-surface-variant border-outline-variant',
  warning: 'bg-warning-soft text-warning border-warning/20',
  teal: 'bg-primary-soft text-primary border-primary/15',
};

/** Compact status chip (reference 1: small rounded status pill beside each election row). */
export function Badge({ variant = 'neutral', icon, dot, live, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border',
        'font-mono text-[0.6875rem] uppercase tracking-[0.06em] whitespace-nowrap',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('inline-block w-1.5 h-1.5 rounded-full bg-current', live && 'live-dot !w-1.5 !h-1.5')} aria-hidden="true" />}
      {icon && <Icon name={icon} size={13} strokeWidth={2} />}
      {children}
    </span>
  );
}

export interface StatusPillProps {
  label: string;
  live?: boolean;
  className?: string;
}

/** Pulsing-dot status line, e.g. "Voting open". */
export function StatusPill({ label, live = true, className }: StatusPillProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 eyebrow !text-primary', className)}>
      <span className={cn('inline-block w-2 h-2 rounded-full bg-primary', live && 'live-dot')} aria-hidden="true" />
      {label}
    </div>
  );
}

/** Election lifecycle status → badge, used everywhere the status is shown. */
export function ElectionStatusBadge({ status, locked }: { status: string; locked?: boolean }) {
  if (locked && status !== 'CLOSED' && status !== 'ARCHIVED') {
    return <Badge variant="error" icon="lock">Locked</Badge>;
  }
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success" dot live>Voting open</Badge>;
    case 'PAUSED':
      return <Badge variant="warning" dot>Paused</Badge>;
    case 'DRAFT':
      return <Badge variant="neutral" dot>Draft</Badge>;
    case 'CLOSED':
      return <Badge variant="teal" icon="lock">Closed</Badge>;
    case 'ARCHIVED':
      return <Badge variant="outline">Archived</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
