import { useState } from 'react';
import { Badge, Button, DataTable, Field, Icon, SelectField, useToast, type DataTableColumn } from '../../components/ui';
import {
  useDeleteVoter,
  useIssueToken,
  useRevokeToken,
  useReplaceToken,
  useSetVoterActive,
  useVotersList,
} from '../../features/voters/useVoters';
import { votersApi } from '../../features/voters/votersApi';
import { VoterFormModal } from '../../features/voters/VoterFormModal';
import { ImportVotersModal } from '../../features/voters/ImportVotersModal';
import { useCurrentElection } from '../../features/elections/useElection';
import { LockBanner } from '../../features/elections/LockBanner';
import { cn } from '../../lib/cn';
import type { Voter, VotingStatus } from '../../features/voters/types';

const VOTING_STATUS_LABEL: Record<VotingStatus, string> = {
  NOT_ISSUED: 'No Token',
  ISSUED: 'Awaiting Vote',
  VOTED: 'Voted',
  REVOKED: 'Revoked',
};

const VOTING_STATUS_VARIANT: Record<VotingStatus, 'neutral' | 'gold' | 'success' | 'error'> = {
  NOT_ISSUED: 'neutral',
  ISSUED: 'gold',
  VOTED: 'success',
  REVOKED: 'error',
};

const PAGE_SIZE = 20;

export function VotersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [formVoter, setFormVoter] = useState<Voter | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState<'voters' | 'links' | null>(null);

  const query = { search: search || undefined, status, page, pageSize: PAGE_SIZE };
  const { data, isLoading } = useVotersList(query);
  const { data: electionData } = useCurrentElection();
  const election = electionData?.election;
  const isLocked = election?.isLocked ?? false;

  const setActive = useSetVoterActive();
  const deleteVoter = useDeleteVoter();
  const issueToken = useIssueToken();
  const revokeToken = useRevokeToken();
  const replaceToken = useReplaceToken();

  const handleToggleActive = async (voter: Voter) => {
    const nextActive = !voter.isActive;
    await setActive.mutateAsync({ id: voter.id, isActive: nextActive });
    toast({
      title: nextActive ? 'Voter activated' : 'Voter deactivated',
      description: nextActive
        ? `${voter.fullName} can now be issued a voting token.`
        : `${voter.fullName} can no longer be issued a voting token.`,
      variant: 'success',
    });
  };

  const handleDelete = async (voter: Voter) => {
    if (!window.confirm(`Delete ${voter.fullName}? This cannot be undone.`)) return;
    try {
      await deleteVoter.mutateAsync(voter.id);
      toast({ title: 'Voter deleted', description: `${voter.fullName} was removed from the roll.`, variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not delete voter', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const handleCopyLink = async (voter: Voter) => {
    try {
      const { votingLink } = await votersApi.votingLink(voter.id);
      await navigator.clipboard.writeText(votingLink);
      toast({ title: 'Link copied', description: `${voter.fullName}'s voting link is on your clipboard.`, variant: 'success' });
    } catch {
      toast({ title: 'Could not copy link', variant: 'error' });
    }
  };

  const handleIssue = async (voter: Voter) => {
    await issueToken.mutateAsync(voter.id);
    toast({ title: 'Token issued', description: `A voting link is now active for ${voter.fullName}.`, variant: 'success' });
  };

  const handleReplace = async (voter: Voter) => {
    await replaceToken.mutateAsync(voter.id);
    toast({ title: 'New token issued', description: `The previous link for ${voter.fullName} was revoked.`, variant: 'success' });
  };

  const handleRevoke = async (voter: Voter) => {
    await revokeToken.mutateAsync(voter.id);
    toast({ title: 'Token revoked', description: `${voter.fullName}'s voting link is no longer valid.`, variant: 'success' });
  };

  const handleExportVoters = async () => {
    setExporting('voters');
    try {
      await votersApi.exportVoters(query);
    } finally {
      setExporting(null);
    }
  };

  const handleExportLinks = async () => {
    setExporting('links');
    try {
      await votersApi.exportVotingLinks();
    } finally {
      setExporting(null);
    }
  };

  const columns: DataTableColumn<Voter>[] = [
    {
      key: 'voter',
      header: 'Voter',
      render: (v) => (
        <div>
          <p className="text-headline-sm font-headline-sm">{v.fullName}</p>
          <p className="text-label-sm font-label-sm text-secondary">{v.membershipNumber}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (v) => (
        <div className="text-body-md">
          <p>{v.email || '—'}</p>
          <p className="text-secondary">{v.phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (v) => <Badge variant={v.isActive ? 'gold' : 'neutral'}>{v.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'votingStatus',
      header: 'Voting Status',
      render: (v) => <Badge variant={VOTING_STATUS_VARIANT[v.votingStatus]}>{VOTING_STATUS_LABEL[v.votingStatus]}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (v) => (
        <div className="flex justify-end flex-wrap gap-2">
          <button
            className="w-9 h-9 flex items-center justify-center border border-on-background hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none"
            aria-label={`Edit ${v.fullName}`}
            disabled={isLocked}
            onClick={() => setFormVoter(v)}
          >
            <Icon name="edit" size={18} />
          </button>
          <button
            className={cn(
              'w-9 h-9 flex items-center justify-center border transition-colors disabled:opacity-40 disabled:pointer-events-none',
              v.isActive
                ? 'border-error text-error hover:bg-error hover:text-on-error'
                : 'border-primary text-primary hover:bg-primary hover:text-on-primary'
            )}
            aria-label={v.isActive ? `Deactivate ${v.fullName}` : `Activate ${v.fullName}`}
            title={v.isActive ? 'Deactivate voter' : 'Activate voter'}
            disabled={isLocked || setActive.isPending}
            onClick={() => handleToggleActive(v)}
          >
            <Icon name={v.isActive ? 'person_off' : 'how_to_reg'} size={18} />
          </button>
          {v.votingStatus === 'NOT_ISSUED' && (
            <button
              className="w-9 h-9 flex items-center justify-center border border-error text-error hover:bg-error hover:text-on-error transition-colors disabled:opacity-40 disabled:pointer-events-none"
              aria-label={`Delete ${v.fullName}`}
              title="Delete voter"
              disabled={isLocked || deleteVoter.isPending}
              onClick={() => handleDelete(v)}
            >
              <Icon name="delete" size={18} />
            </button>
          )}

          {v.votingStatus === 'NOT_ISSUED' && (
            <Button size="sm" variant="primary" disabled={isLocked} onClick={() => handleIssue(v)}>
              Issue Token
            </Button>
          )}
          {v.votingStatus === 'ISSUED' && (
            <>
              <button
                className="w-9 h-9 flex items-center justify-center border border-on-background hover:bg-surface-container-high"
                aria-label={`Copy voting link for ${v.fullName}`}
                onClick={() => handleCopyLink(v)}
              >
                <Icon name="content_copy" size={18} />
              </button>
              <Button size="sm" variant="secondary" disabled={isLocked} onClick={() => handleReplace(v)}>
                Issue New Token
              </Button>
              <Button size="sm" variant="danger" disabled={isLocked} onClick={() => handleRevoke(v)}>
                Revoke
              </Button>
            </>
          )}
          {v.votingStatus === 'REVOKED' && (
            <Button size="sm" variant="primary" disabled={isLocked} onClick={() => handleReplace(v)}>
              Issue New Token
            </Button>
          )}
        </div>
      ),
    },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {election && <LockBanner election={election} />}

      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-on-background pb-6">
        <div>
          <h1 className="text-headline-xl font-headline-xl uppercase">Voters</h1>
          <p className="text-body-lg text-secondary">Manage the voter roll, imports, and voting tokens.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" leftIcon="download" loading={exporting === 'voters'} onClick={handleExportVoters}>
            Export List
          </Button>
          <Button variant="secondary" leftIcon="link" loading={exporting === 'links'} onClick={handleExportLinks}>
            Download Links
          </Button>
          <Button variant="secondary" leftIcon="upload_file" disabled={isLocked} onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Button variant="primary" leftIcon="add" disabled={isLocked} onClick={() => setFormVoter(null)}>
            Add Voter
          </Button>
        </div>
      </section>

      <section className="bg-surface-container-low border border-on-background p-6 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <Field
            icon="search"
            placeholder="Search by name, membership number, or email..."
            aria-label="Search voters"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
        >
          <option value="all">All Voters</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
      </section>

      <section className="bg-surface border border-on-background">
        <DataTable
          columns={columns}
          rows={data?.voters ?? []}
          rowKey={(v) => v.id}
          emptyMessage={isLoading ? 'Loading voters…' : 'No voters match your filters.'}
        />
        <div className="flex justify-between items-center px-4 py-4 bg-surface-container-lowest border-t border-outline-variant">
          <p className="text-label-md font-label-md text-secondary">
            {total === 0 ? 'No voters' : `Page ${page} of ${totalPages} — ${total} voters`}
          </p>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 flex items-center justify-center border border-on-background disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center border border-on-background disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        </div>
      </section>

      <VoterFormModal
        open={formVoter !== undefined}
        voter={formVoter}
        onClose={() => setFormVoter(undefined)}
        onSuccess={(message) => toast({ title: message, variant: 'success' })}
      />
      <ImportVotersModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
