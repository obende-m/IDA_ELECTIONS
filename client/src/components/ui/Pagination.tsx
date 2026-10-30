import { Icon } from './Icon';

export interface PaginationProps {
  page: number;
  totalPages: number;
  /** Summary text shown on the left, e.g. "Page 1 of 3 — 52 voters". */
  summary: string;
  onPageChange: (page: number) => void;
}

const BUTTON_CLASS =
  'w-10 h-10 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none transition-colors';

/** Previous/next footer shared by every paginated admin table. */
export function Pagination({ page, totalPages, summary, onPageChange }: PaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap justify-between items-center gap-3 px-4 py-4 bg-surface-container-lowest border-t border-outline-variant"
    >
      <p className="text-label-md font-label-md text-secondary" aria-live="polite">
        {summary}
      </p>
      <div className="flex gap-2">
        <button type="button" className={BUTTON_CLASS} aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
          <Icon name="chevron_left" size={18} />
        </button>
        <button
          type="button"
          className={BUTTON_CLASS}
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </nav>
  );
}
