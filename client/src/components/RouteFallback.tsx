import { Icon, Spinner } from './ui';

/** Full-screen fallback while a layout's code chunk loads (first visit to /vote or /admin). */
export function FullPageFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background text-center px-6">
      <div className="relative w-16 h-16 rounded-full bg-on-background flex items-center justify-center border-2 border-primary-container">
        <Icon name="how_to_vote" filled size={28} className="text-primary-container" />
      </div>
      <div className="flex items-center gap-3 text-secondary">
        <Spinner className="h-5 w-5" />
        <span className="text-label-md font-label-md uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}

/** In-layout fallback while an individual page chunk loads (the surrounding chrome stays on screen). */
export function ContentFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center gap-3 py-24 text-secondary">
      <Spinner className="h-6 w-6" />
      <span className="text-label-md font-label-md uppercase tracking-widest">{label}</span>
    </div>
  );
}
