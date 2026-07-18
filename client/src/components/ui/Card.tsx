import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the gold top-accent line used by "Professional Analytics Cards" (DESIGN.md). */
  accent?: boolean;
  /** Flips to the black "inverse" surface used for the Time Remaining KPI tile. */
  inverse?: boolean;
  children?: ReactNode;
}

/** Flat 1px-black-border card, gold border on hover — the base "bento-card" from every Stitch screen. */
export function Card({ accent, inverse, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border transition-all',
        inverse
          ? 'bg-on-background text-on-primary border-on-background'
          : 'bg-surface text-on-background border-on-background hover:border-primary-container',
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
    <div className={cn('border-b-2 border-primary pb-4', className)} {...props}>
      {children}
    </div>
  );
}
