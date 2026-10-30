import { Spinner } from './ui';
import { BrandMark } from './Brand';

/** Full-screen fallback while a layout's code chunk loads (first visit to /vote or /admin). */
export function FullPageFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-background text-center px-6">
      <BrandMark size={48} className="text-on-background animate-fade" />
      <div className="flex items-center gap-2.5 text-secondary">
        <Spinner className="h-4 w-4" />
        <span className="eyebrow">{label}</span>
      </div>
    </div>
  );
}

/** In-layout fallback while an individual page chunk loads (the surrounding chrome stays on screen). */
export function ContentFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center gap-2.5 py-24 text-secondary">
      <Spinner className="h-5 w-5" />
      <span className="eyebrow">{label}</span>
    </div>
  );
}
