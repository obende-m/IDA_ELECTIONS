import { Icon } from './Icon';

export interface PaginationProps {
  page: number;
  totalPages: number;
  summary: string;
  onPageChange: (page: number) => void;
}

const BTN =
  'h-9 min-w-9 px-2 rounded-lg flex items-center justify-center text-[0.8125rem] tabular border border-transparent ' +
  'hover:border-outline-variant hover:bg-surface-container-lowest disabled:opacity-35 disabled:pointer-events-none transition-colors';

function pageList(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i && p - (sorted[i - 1] as number) > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({ page, totalPages, summary, onPageChange }: PaginationProps) {
  const total = Math.max(1, totalPages);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap justify-between items-center gap-3 px-4 py-3 border-t border-outline-variant">
      <p className="text-[0.8125rem] text-secondary tabular" aria-live="polite">
        {summary}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className={BTN} aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <Icon name="chevron_left" size={16} />
        </button>
        <span className="hidden sm:contents">
          {pageList(page, total).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-secondary" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPageChange(p)}
                className={p === page ? `${BTN} !bg-on-background !text-on-primary` : BTN}
              >
                {p}
              </button>
            )
          )}
        </span>
        <button type="button" className={BTN} aria-label="Next page" disabled={page >= total} onClick={() => onPageChange(page + 1)}>
          <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </nav>
  );
}
