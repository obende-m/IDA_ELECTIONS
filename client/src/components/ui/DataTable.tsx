import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Icon } from './Icon';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
  className?: string;
  /** Makes the column sortable (client-side, current page) by this value. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Hide on narrow screens (row stays readable on phones). */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  label?: string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Highlights a row (reference 3: the inverted "current" row). */
  isRowActive?: (row: T) => boolean;
}

const ALIGN: Record<'left' | 'right' | 'center', string> = { left: 'text-left', right: 'text-right', center: 'text-center' };

/**
 * Editorial data table: mono uppercase headers, hairline row rules, no zebra, generous row height, sortable headers,
 * skeleton loading rows, and an inline error with retry. Scrolls horizontally inside its own frame on small screens.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
  className,
  label,
  isLoading,
  error,
  onRetry,
  isRowActive,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const showError = Boolean(error) && rows.length === 0;
  const showLoading = !showError && Boolean(isLoading) && rows.length === 0;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));

  return (
    <div className={cn('w-full overflow-x-auto', className)} tabIndex={0} role="region" aria-label={label ?? 'Data table'}>
      <table className="w-full border-collapse md:min-w-[36rem]" aria-busy={isLoading ? true : undefined}>
        {label && <caption className="sr-only">{label}</caption>}
        <thead>
          <tr className="border-b border-on-background/80">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : col.sortValue ? 'none' : undefined}
                  className={cn('px-4 pt-3 pb-2.5 eyebrow !text-on-background font-medium whitespace-nowrap', ALIGN[col.align ?? 'left'], col.hideOnMobile && 'hidden md:table-cell')}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn('inline-flex items-center gap-1 uppercase tracking-[inherit] hover:text-primary', col.align === 'right' && 'flex-row-reverse')}
                    >
                      {col.header}
                      <Icon name={active ? (sort!.dir === 'asc' ? 'expand_less' : 'expand_more') : 'unfold'} size={13} className={active ? 'text-primary' : 'text-secondary'} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {showError ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center">
                <div role="alert" className="flex flex-col items-center gap-3">
                  <Icon name="error" size={26} className="text-error" />
                  <p className="text-body-md text-secondary">{error instanceof Error && error.message ? error.message : 'Could not load this data.'}</p>
                  {onRetry && (
                    <Button variant="secondary" size="sm" leftIcon="refresh" onClick={onRetry}>
                      Try again
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : showLoading ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className="border-b border-outline-variant" aria-hidden={i > 0 ? true : undefined}>
                {columns.map((col, j) => (
                  <td key={col.key} className={cn('px-4 py-4', col.hideOnMobile && 'hidden md:table-cell')}>
                    {i === 0 && j === 0 && <span className="sr-only" role="status">Loading…</span>}
                    <div className="skeleton h-3.5" style={{ width: `${45 + ((i * 7 + j * 13) % 45)}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center text-body-md text-secondary">
                <Icon name="inbox" size={24} className="mx-auto mb-2 text-outline" />
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const active = isRowActive?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    'border-b border-outline-variant transition-colors duration-150',
                    active ? 'bg-on-background text-on-primary [&_.text-secondary]:text-on-primary/70' : 'hover:bg-surface-bright'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-4 py-3.5 text-[0.9rem] align-middle', ALIGN[col.align ?? 'left'], col.hideOnMobile && 'hidden md:table-cell', col.className)}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
