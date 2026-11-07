import { cn } from '../lib/cn';

/** The official Igarra Development Association emblem (public/logo-mark.png, transparent round crop). */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return <img src="/logo-mark.png" width={size} height={size} alt="" aria-hidden="true" draggable={false} className={cn('rounded-full shrink-0 select-none', className)} />;
}

/** Wordmark: serif "IDA" + mono descriptor. */
export function Brand({ subtitle = 'Election Portal', inverse, className, markSize = 36 }: { subtitle?: string; inverse?: boolean; className?: string; markSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark size={markSize} className={inverse ? 'ring-2 ring-white/25' : undefined} />
      <span className="leading-none">
        <span className={cn('block font-serif text-[1.3rem] font-semibold tracking-[-0.02em]', inverse ? 'text-on-primary' : 'text-on-background')}>IDA</span>
        <span className={cn('block mt-1 font-mono text-[0.625rem] uppercase tracking-[0.14em]', inverse ? 'text-on-primary/60' : 'text-secondary')}>{subtitle}</span>
      </span>
    </span>
  );
}
