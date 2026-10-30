import { cn } from '../../lib/cn';

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  label?: string;
}

/** Thin linear track; animates width changes. */
export function ProgressBar({ value, max = 100, className, trackClassName, barClassName, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={cn('w-full h-1.5 bg-surface-container overflow-hidden rounded-full', trackClassName, className)}
    >
      <div className={cn('h-full bg-primary rounded-full transition-[width] duration-700 ease-[var(--ease-out-quart)]', barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
