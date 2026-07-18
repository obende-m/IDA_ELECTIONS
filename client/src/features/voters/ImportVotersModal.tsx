import { useRef, useState } from 'react';
import { Button, Icon, Modal } from '../../components/ui';
import { useImportVoters } from './useVoters';
import type { ImportReport } from './types';

export interface ImportVotersModalProps {
  open: boolean;
  onClose: () => void;
}

type ReportListKey = Exclude<keyof ImportReport, 'totalRows'>;

const REPORT_ROWS: { key: ReportListKey; label: string; tone: string }[] = [
  { key: 'imported', label: 'Imported', tone: 'text-primary' },
  { key: 'updated', label: 'Updated', tone: 'text-on-background' },
  { key: 'skipped', label: 'Skipped', tone: 'text-secondary' },
  { key: 'duplicates', label: 'Duplicate Rows', tone: 'text-secondary' },
  { key: 'invalid', label: 'Invalid Rows', tone: 'text-error' },
];

export function ImportVotersModal({ open, onClose }: ImportVotersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const importVoters = useImportVoters();

  const handleClose = () => {
    setFile(null);
    setReport(null);
    onClose();
  };

  const handleImport = async () => {
    if (!file) return;
    const result = await importVoters.mutateAsync(file);
    setReport(result.report);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Voters">
      {!report ? (
        <div className="space-y-6">
          <p className="text-body-md text-secondary">
            Upload a CSV or Excel file with columns for Membership Number, Full Name, Phone Number, Email Address
            (optional), and Status (Active/Inactive). Existing membership numbers will be updated; new ones will be added.
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full border-2 border-dashed border-outline-variant p-10 flex flex-col items-center gap-3 hover:border-primary transition-colors"
          >
            <Icon name="upload_file" size={32} className="text-secondary" />
            <span className="text-label-md font-label-md">{file ? file.name : 'Click to choose a .csv or .xlsx file'}</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={!file} loading={importVoters.isPending} onClick={handleImport}>
              Import
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {REPORT_ROWS.map((r) => (
              <div key={r.key} className="border border-on-background p-4 text-center">
                <p className={`text-headline-lg font-headline-lg ${r.tone}`}>{report[r.key].length}</p>
                <p className="text-label-sm font-label-sm text-secondary uppercase tracking-widest">{r.label}</p>
              </div>
            ))}
          </div>

          {report.invalid.length > 0 && (
            <div className="border border-error max-h-48 overflow-y-auto">
              <p className="px-4 py-2 bg-error-container text-on-error-container text-label-sm font-label-sm font-bold uppercase">
                Rows needing attention
              </p>
              <ul className="divide-y divide-outline-variant">
                {report.invalid.map((row) => (
                  <li key={row.row} className="px-4 py-2 text-body-md">
                    Row {row.row}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
