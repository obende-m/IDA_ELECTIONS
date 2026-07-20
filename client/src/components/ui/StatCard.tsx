import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: string;
  helpText?: ReactNode;
  /** Black "inverse" tile used for the Time Remaining KPI on the admin dashboard. */
  inverse?: boolean;
  className?: string;
}

/** KPI tile: gold top border, uppercase tracked label, large headline value (Admin Dashboard "bento" stat cards). */
export function StatCard({ label, value, icon, helpText, inverse, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-6 rounded-xl transition-all',
        inverse
          ? 'bg-on-background text-on-primary shadow-sm'
          : 'bg-surface border-t-2 border-primary-container border-x border-b border-outline-variant shadow-sm hover:shadow-md',
        className
      )}
    >
      <div className="flex justify-between items-start">
        <span
          className={cn(
            'text-label-md font-label-md uppercase tracking-widest',
            inverse ? 'text-primary-container' : 'text-secondary'
          )}
        >
          {label}
        </span>
        {icon && <Icon name={icon} className={inverse ? 'text-primary-container' : 'text-primary'} />}
      </div>
      <div className="flex flex-col">
        <span className="text-headline-lg font-headline-lg">{value}</span>
        {helpText && (
          <span className={cn('text-label-sm font-label-sm', inverse ? 'text-secondary-fixed' : 'text-secondary font-bold')}>
            {helpText}
          </span>
        )}
      </div>
    </div>
  );
}
