import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Icon } from './Icon';
import { Spinner } from './StateViews';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  /** Accessible name for the table (announced by screen readers). */
  label?: string;
  /** Shows a loading row instead of the empty message while the first page of data loads. */
  isLoading?: boolean;
  /** When set (and there are no rows to show), renders an error row with a Retry button. */
  error?: unknown;
  onRetry?: () => void;
}

const ALIGN_CLASS: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/**
 * Neutral-header data table with soft row dividers and a subtle hover state, no zebra striping (DESIGN.md Data Tables).
 * The wrapper scrolls horizontally on narrow screens so wide tables never break the page layout.
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
}: DataTableProps<T>) {
  const showError = Boolean(error) && rows.length === 0;
  const showLoading = !showError && Boolean(isLoading) && rows.length === 0;

  return (
    <div className={cn('w-full overflow-x-auto', className)} tabIndex={0} role="region" aria-label={label ?? 'Data table'}>
      <table className="w-full border-collapse min-w-[40rem]" aria-busy={isLoading ? true : undefined}>
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-label-md font-label-md uppercase tracking-widest text-on-background whitespace-nowrap',
                  ALIGN_CLASS[col.align ?? 'left']
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showError ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div role="alert" className="flex flex-col items-center gap-3">
                  <Icon name="error" filled size={28} className="text-error" />
                  <p className="text-body-md text-secondary">
                    {error instanceof Error && error.message ? error.message : 'Could not load this data.'}
                  </p>
                  {onRetry && (
                    <Button variant="secondary" size="sm" leftIcon="refresh" onClick={onRetry}>
                      Try again
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : showLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div role="status" className="flex items-center justify-center gap-3 text-secondary">
                  <Spinner />
                  <span className="text-body-md">Loading…</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-body-md text-secondary">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-surface-container-high hover:bg-surface-container-low/60 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-4 text-body-md align-middle', col.className, ALIGN_CLASS[col.align ?? 'left'])}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
