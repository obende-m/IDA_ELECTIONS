function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Serializes an array of flat objects into CSV text using `columns` as the header row and field order. */
export function toCsv<T extends object>(rows: T[], columns: { key: keyof T; header: string }[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(','));
  return [header, ...body].join('\r\n');
}
