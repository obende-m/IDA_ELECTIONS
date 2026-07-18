import { apiDownload } from '../../lib/apiClient';

export type ReportType = 'summary' | 'positions' | 'participation' | 'audit';
export type ReportFormat = 'pdf' | 'xlsx' | 'csv';

const FILE_EXTENSIONS: Record<ReportFormat, string> = { pdf: 'pdf', xlsx: 'xlsx', csv: 'csv' };

export const reportsApi = {
  download: (type: ReportType, format: ReportFormat) =>
    apiDownload(`/reports/${type}/${format}`, `${type}-report.${FILE_EXTENSIONS[format]}`),
};
