import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Thin brass rule along the top edge, for the one card on a screen that deserves emphasis. */
  accent?: boolean;
  /** Ink (charcoal) surface. */
  inverse?: boolean;
  /** Adds the hover lift — only for cards that are themselves clickable. */
  interactive?: boolean;
  children?: ReactNode;
}

export function Card({ accent, inverse, interactive, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-[border-color,box-shadow] duration-200',
        inverse ? 'bg-on-background text-on-primary border-on-background' : 'bg-surface-container-lowest text-on-background border-outline-variant',
        interactive && !inverse && 'hover:border-outline hover:shadow-md',
        accent && !inverse && 'relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-primary-container',
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
    <div className={cn('flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6', className)} {...props}>
      {children}
    </div>
  );
}

/** Section title used inside cards: small serif heading + optional mono kicker. */
export function CardTitle({ kicker, children, className }: { kicker?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      {kicker && <p className="eyebrow mb-1">{kicker}</p>}
      <h2 className="font-serif text-[1.25rem] leading-tight tracking-[-0.01em] text-on-background">{children}</h2>
    </div>
  );
}
