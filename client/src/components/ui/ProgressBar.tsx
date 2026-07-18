import { cn } from '../../lib/cn';

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

/** Thin linear progress track used for turnout KPIs and the mobile voting-position stepper. */
export function ProgressBar({ value, max = 100, className, trackClassName, barClassName }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full h-2 bg-surface-container overflow-hidden', trackClassName, className)}>
      <div className={cn('h-full bg-primary transition-all', barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
