import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

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
}

const ALIGN_CLASS: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/** Neutral-header data table with soft row dividers and a subtle hover state, no zebra striping (DESIGN.md Data Tables). */
export function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No records found.', className }: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant">
            {columns.map((col) => (
              <th
                key={col.key}
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
          {rows.length === 0 ? (
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
