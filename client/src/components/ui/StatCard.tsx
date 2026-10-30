import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: string;
  helpText?: ReactNode;
  /** Ink (charcoal) tile — for the single most time-critical figure. */
  inverse?: boolean;
  className?: string;
  /** Optional visual under the value (e.g. a progress bar). */
  children?: ReactNode;
}

/** KPI tile: mono label, large serif figure, quiet supporting line. */
export function StatCard({ label, value, icon, helpText, inverse, className, children }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between gap-4 p-4 sm:p-6 rounded-xl border min-h-[8.5rem] min-w-0',
        inverse ? 'bg-on-background text-on-primary border-on-background' : 'bg-surface-container-lowest border-outline-variant',
        className
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <span className={cn('eyebrow', inverse && '!text-primary-fixed-dim')}>{label}</span>
        {icon && (
          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', inverse ? 'bg-white/8 text-primary-fixed-dim' : 'bg-surface-container-low text-primary')}>
            <Icon name={icon} size={17} />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-serif text-[1.75rem] sm:text-[2.25rem] leading-none tracking-[-0.02em] tabular">{value}</span>
        {helpText && <span className={cn('text-[0.8125rem]', inverse ? 'text-on-primary/65' : 'text-secondary')}>{helpText}</span>}
        {children}
      </div>
    </div>
  );
}
