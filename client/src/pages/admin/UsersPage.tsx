import { useState } from 'react';
import { ActionMenu, Badge, Button, Card, DataTable, PageHeader, useConfirm, useToast, type DataTableColumn } from '../../components/ui';
import { RestrictedNotice } from '../../components/AdminNotices';
import { useAuth } from '../../features/auth/AuthContext';
import { useSetUserActive, useUsersList, useResetUserPassword } from '../../features/users/useUsers';
import { UserFormModal } from '../../features/users/UserFormModal';
import { ResetPasswordModal } from '../../features/users/ResetPasswordModal';
import type { AdminUser } from '../../features/users/types';

const ROLE: Record<AdminUser['role'], { label: string; desc: string; variant: 'teal' | 'gold' | 'outline' }> = {
  SUPER_ADMIN: { label: 'Super Admin', desc: 'Everything, incl. accounts & unlock', variant: 'teal' },
  ELECTION_COMMITTEE: { label: 'Election Committee', desc: 'Lifecycle, schedule, vote records', variant: 'gold' },
  ADMIN: { label: 'Administrator', desc: 'Ballot and voter data entry', variant: 'outline' },
};

/** Super Admin only (server-enforced in user.routes.ts). */
export function UsersPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const isAuthorized = currentUser?.role === 'SUPER_ADMIN';
  const { data, isLoading, isError, error, refetch } = useUsersList();
  const [formOpen, setFormOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const setActive = useSetUserActive();
  const resetPassword = useResetUserPassword();

  if (!isAuthorized) return <RestrictedNotice>Managing admin accounts is only available to Super Admin accounts.</RestrictedNotice>;

  const toggleActive = async (u: AdminUser) => {
    if (u.isActive && !(await confirm({ title: `Deactivate ${u.fullName}?`, message: 'They are signed out on their next request and cannot sign in again until reactivated.', confirmLabel: 'Deactivate', tone: 'danger' }))) return;
    try {
      await setActive.mutateAsync({ id: u.id, isActive: !u.isActive });
      toast({ title: u.isActive ? 'Account deactivated' : 'Account activated', description: u.fullName, variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not update account', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const handleReset = async (password: string) => {
    if (!resetTarget) return;
    try {
      await resetPassword.mutateAsync({ id: resetTarget.id, password });
      toast({ title: 'Password reset', description: `${resetTarget.fullName} has been signed out everywhere.`, variant: 'success' });
      setResetTarget(null);
    } catch (err) {
      toast({ title: 'Could not reset password', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const users = data?.users ?? [];
  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'user',
      header: 'Account',
      sortValue: (u) => u.fullName,
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center text-[0.8125rem] font-semibold shrink-0" aria-hidden="true">
            {u.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-medium">
              {u.fullName}
              {u.id === currentUser?.id && <span className="ml-2 text-[0.75rem] text-secondary">(you)</span>}
            </p>
            <p className="text-[0.8125rem] text-secondary truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (u) => u.role,
      render: (u) => (
        <div>
          <Badge variant={ROLE[u.role].variant}>{ROLE[u.role].label}</Badge>
          <p className="mt-1 text-[0.75rem] text-secondary hidden md:block">{ROLE[u.role].desc}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (u) => <Badge variant={u.isActive ? 'success' : 'neutral'} dot>{u.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'createdAt', header: 'Created', hideOnMobile: true, sortValue: (u) => u.createdAt, render: (u) => <span className="text-secondary tabular">{new Date(u.createdAt).toLocaleDateString()}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <div className="flex justify-end">
            <ActionMenu
              label={`Actions for ${u.fullName}`}
              items={[
                { label: 'Reset password', icon: 'key', onSelect: () => setResetTarget(u) },
                { label: u.isActive ? 'Deactivate account' : 'Activate account', icon: u.isActive ? 'block' : 'check_circle', tone: u.isActive ? 'danger' : 'default', disabled: isSelf && u.isActive, onSelect: () => toggleActive(u) },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="Admin accounts"
        description="Who can sign in to this portal, and what each person can do."
        actions={
          <Button leftIcon="group_add" onClick={() => setFormOpen(true)}>
            Add account
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(ROLE) as AdminUser['role'][]).map((r) => (
          <div key={r} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between">
              <Badge variant={ROLE[r].variant}>{ROLE[r].label}</Badge>
              <span className="font-serif text-[1.5rem] tabular">{users.filter((u) => u.role === r).length}</span>
            </div>
            <p className="mt-2 text-[0.8125rem] text-secondary">{ROLE[r].desc}</p>
          </div>
        ))}
      </div>
      <Card className="overflow-hidden">
        <DataTable columns={columns} rows={users} rowKey={(u) => u.id} label="Admin accounts" emptyMessage="No accounts found." isLoading={isLoading} error={isError ? error : undefined} onRetry={() => refetch()} />
      </Card>
      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} onSuccess={(m) => toast({ title: m, variant: 'success' })} />
      <ResetPasswordModal open={resetTarget !== null} fullName={resetTarget?.fullName ?? ''} loading={resetPassword.isPending} onClose={() => setResetTarget(null)} onConfirm={handleReset} />
    </>
  );
}
