import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export type BadgeVariant = 'gold' | 'neutral' | 'success' | 'error' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: string;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  gold: 'bg-primary-container text-on-primary-container',
  neutral: 'bg-surface-container-high text-on-background',
  success: 'bg-green-100 text-green-800',
  error: 'bg-error-container text-on-error-container',
  outline: 'bg-surface border border-outline-variant text-on-background',
};

/** Pill-shaped tag used for "Verified", position labels, and status chips (DESIGN.md Verification Chips). */
export function Badge({ variant = 'neutral', icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-label-sm font-bold uppercase tracking-wider',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {icon && <Icon name={icon} filled size={14} />}
      {children}
    </span>
  );
}

export interface StatusPillProps {
  label: string;
  live?: boolean;
  className?: string;
}

/** Pulsing-dot status indicator, e.g. "LIVE ELECTION STATUS: ACTIVE". */
export function StatusPill({ label, live = true, className }: StatusPillProps) {
  return (
    <div className={cn('flex items-center gap-2 text-label-md font-label-md uppercase text-primary', className)}>
      <span className="relative flex h-3 w-3">
        {live && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />}
        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
      </span>
      {label}
    </div>
  );
}
