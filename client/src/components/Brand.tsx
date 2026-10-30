import { cn } from '../lib/cn';

/** IDA mark: a ballot being dropped into a box. Pure SVG; the box takes currentColor. */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="currentColor" />
      {/* ballot paper */}
      <rect x="15" y="8" width="10" height="13" rx="1.5" fill="var(--color-primary-container)" />
      <path d="M17.5 12.5h5M17.5 15.5h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* box with slot */}
      <path d="M10 19h20v11a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V19z" fill="var(--color-background)" />
      <rect x="14" y="18" width="12" height="2.4" rx="1.2" fill="currentColor" />
    </svg>
  );
}

/** Wordmark: serif "IDA" + mono descriptor. */
export function Brand({ subtitle = 'Election Portal', inverse, className }: { subtitle?: string; inverse?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark className={inverse ? 'text-on-primary' : 'text-on-background'} />
      <span className="leading-none">
        <span className={cn('block font-serif text-[1.3rem] font-semibold tracking-[-0.02em]', inverse ? 'text-on-primary' : 'text-on-background')}>IDA</span>
        <span className={cn('block mt-1 font-mono text-[0.625rem] uppercase tracking-[0.14em]', inverse ? 'text-on-primary/60' : 'text-secondary')}>{subtitle}</span>
      </span>
    </span>
  );
}
