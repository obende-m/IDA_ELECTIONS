import { useState } from 'react';
import { Badge, Button, DataTable, Field, Icon, SelectField, type DataTableColumn } from '../../components/ui';

interface CandidateRow {
  id: string;
  name: string;
  position: string;
  status: 'VERIFIED' | 'PENDING';
}

const CANDIDATES: CandidateRow[] = [
  { id: 'IDA-2024-001', name: 'Prince Adeyemi Igarra', position: 'Presidential Candidate', status: 'VERIFIED' },
  { id: 'IDA-2024-042', name: 'Chief (Mrs) Elena Ojo', position: 'General Secretary', status: 'VERIFIED' },
  { id: 'IDA-2024-088', name: 'Dr. Samuel Ebira', position: 'Financial Secretary', status: 'PENDING' },
];

/** Ported from candidate_management_admin_portal/code.html; wired to real candidate CRUD in the Election/Position/Candidate module. */
export function CandidatesPage() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const columns: DataTableColumn<CandidateRow>[] = [
    {
      key: 'details',
      header: 'Candidate Details',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
            <Icon name="account_circle" className="text-secondary" size={28} />
          </div>
          <div>
            <p className="text-headline-sm font-headline-sm">{row.name}</p>
            <p className="text-label-sm font-label-sm text-secondary">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Position Title',
      render: (row) => <Badge variant="outline">{row.position}</Badge>,
    },
    {
      key: 'status',
      header: 'Verification Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${row.status === 'VERIFIED' ? 'bg-primary' : 'bg-secondary'}`} />
          <Badge variant={row.status === 'VERIFIED' ? 'gold' : 'neutral'}>{row.status}</Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: () => (
        <div className="flex justify-end gap-2">
          <button className="w-9 h-9 flex items-center justify-center border border-on-background hover:bg-surface-container-high" aria-label="Edit candidate">
            <Icon name="edit" size={18} />
          </button>
          <button className="w-9 h-9 flex items-center justify-center border border-on-background hover:bg-surface-container-high" aria-label="Delete candidate">
            <Icon name="delete" size={18} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-on-background pb-6">
        <div>
          <h1 className="text-headline-xl font-headline-xl uppercase">Candidate Management</h1>
          <p className="text-body-lg text-secondary">Oversee official ballot entries for the 2024 Election Cycle.</p>
        </div>
        <Button variant="primary" leftIcon="add" uppercase>
          Add Candidate
        </Button>
      </section>

      <section className="bg-surface-container-low border border-on-background p-6 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <Field icon="search" placeholder="Search by name, position, or ID..." aria-label="Search candidates" />
        </div>
        <SelectField label="Filter by Position" defaultValue="all">
          <option value="all">All Positions</option>
          <option value="presidential">Presidential Candidate</option>
          <option value="secretary">General Secretary</option>
          <option value="financial">Financial Secretary</option>
        </SelectField>
        <div className="flex border border-on-background">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 text-label-md font-label-md ${tab === 'active' ? 'bg-primary text-on-primary' : 'bg-surface text-on-background'}`}
          >
            Active
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`px-4 py-2 text-label-md font-label-md border-l border-on-background ${tab === 'archived' ? 'bg-primary text-on-primary' : 'bg-surface text-on-background'}`}
          >
            Archived
          </button>
        </div>
      </section>

      <section className="bg-surface border border-on-background">
        <DataTable columns={columns} rows={CANDIDATES} rowKey={(row) => row.id} />
        <div className="flex justify-between items-center px-4 py-4 bg-surface-container-lowest border-t border-outline-variant">
          <p className="text-label-md font-label-md text-secondary">Showing 1-{CANDIDATES.length} of {CANDIDATES.length} candidates</p>
          <div className="flex gap-2">
            <button className="w-9 h-9 flex items-center justify-center border border-on-background disabled:opacity-40" disabled>
              <Icon name="chevron_left" size={18} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center border border-on-background disabled:opacity-40" disabled>
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
