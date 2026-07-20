import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the gold top-accent line used by "Professional Analytics Cards" (DESIGN.md). */
  accent?: boolean;
  /** Flips to the black "inverse" surface used for the Time Remaining KPI tile. */
  inverse?: boolean;
  children?: ReactNode;
}

/** Soft-elevated rounded card with a gentle hover lift — the base "bento-card" from every Stitch screen. */
export function Card({ accent, inverse, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        inverse
          ? 'bg-on-background text-on-primary border-on-background shadow-sm'
          : 'bg-surface text-on-background border-outline-variant shadow-sm hover:shadow-md hover:border-primary-container hover:-translate-y-0.5',
        accent && !inverse && 'border-t-2 border-t-primary-container',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-primary-container/60 pb-4', className)} {...props}>
      {children}
    </div>
  );
}
