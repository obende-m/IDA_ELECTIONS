import { useState } from 'react';
import { Badge, Button, DataTable, Icon, useToast, type DataTableColumn } from '../../components/ui';
import { useAuth } from '../../features/auth/AuthContext';
import { useSetUserActive, useUsersList, useResetUserPassword } from '../../features/users/useUsers';
import { UserFormModal } from '../../features/users/UserFormModal';
import { ResetPasswordModal } from '../../features/users/ResetPasswordModal';
import { cn } from '../../lib/cn';
import type { AdminUser } from '../../features/users/types';

const ROLE_LABEL: Record<AdminUser['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  ELECTION_COMMITTEE: 'Election Committee',
  ADMIN: 'Admin',
};

/** No Stitch mock exists for this screen. Super Admin-only — see user.routes.ts. */
export function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isAuthorized = currentUser?.role === 'SUPER_ADMIN';
  const { data, isLoading } = useUsersList();
  const [formOpen, setFormOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);

  const setActive = useSetUserActive();
  const resetPassword = useResetUserPassword();

  if (!isAuthorized) {
    return (
      <section className="flex flex-col items-center justify-center text-center gap-4 rounded-xl border border-error shadow-sm py-24 px-8">
        <Icon name="lock" filled size={32} className="text-error" />
        <h1 className="text-headline-md font-headline-md uppercase">Access Restricted</h1>
        <p className="text-body-md text-secondary max-w-md">
          Managing admin accounts is only available to Super Admin accounts.
        </p>
      </section>
    );
  }

  const handleToggleActive = async (target: AdminUser) => {
    const nextActive = !target.isActive;
    try {
      await setActive.mutateAsync({ id: target.id, isActive: nextActive });
      toast({
        title: nextActive ? 'Account activated' : 'Account deactivated',
        description: `${target.fullName} can ${nextActive ? 'now' : 'no longer'} log in.`,
        variant: 'success',
      });
    } catch (err) {
      toast({ title: 'Could not update account', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!resetTarget) return;
    try {
      await resetPassword.mutateAsync({ id: resetTarget.id, password });
      toast({ title: 'Password reset', description: `${resetTarget.fullName} has been signed out everywhere.`, variant: 'success' });
      setResetTarget(null);
    } catch (err) {
      toast({ title: 'Could not reset password', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    }
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'user',
      header: 'Account',
      render: (u) => (
        <div>
          <p className="text-headline-sm font-headline-sm">{u.fullName}</p>
          <p className="text-label-sm font-label-sm text-secondary">{u.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <Badge variant={u.isActive ? 'gold' : 'neutral'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'createdAt', header: 'Created', render: (u) => new Date(u.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <div className="flex justify-end flex-wrap gap-2">
            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-high hover:border-on-background transition-colors disabled:opacity-40 disabled:pointer-events-none"
              aria-label={`Reset password for ${u.fullName}`}
              title="Reset password"
              onClick={() => setResetTarget(u)}
            >
              <Icon name="key" size={18} />
            </button>
            <button
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-40 disabled:pointer-events-none',
                u.isActive
                  ? 'border-error text-error hover:bg-error hover:text-on-error'
                  : 'border-primary text-primary hover:bg-primary hover:text-on-primary'
              )}
              aria-label={u.isActive ? `Deactivate ${u.fullName}` : `Activate ${u.fullName}`}
              title={isSelf ? "You can't deactivate your own account" : u.isActive ? 'Deactivate account' : 'Activate account'}
              disabled={setActive.isPending || (isSelf && u.isActive)}
              onClick={() => handleToggleActive(u)}
            >
              <Icon name={u.isActive ? 'person_off' : 'how_to_reg'} size={18} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-headline-xl font-headline-xl uppercase">Admin Accounts</h1>
          <p className="text-body-lg text-secondary">Create and manage Admin and Election Committee logins.</p>
        </div>
        <Button variant="primary" leftIcon="add" onClick={() => setFormOpen(true)}>
          Add Admin
        </Button>
      </section>

      <section className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.users ?? []}
          rowKey={(u) => u.id}
          emptyMessage={isLoading ? 'Loading accounts…' : 'No accounts found.'}
        />
      </section>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} onSuccess={(message) => toast({ title: message, variant: 'success' })} />
      <ResetPasswordModal
        open={resetTarget !== null}
        fullName={resetTarget?.fullName ?? ''}
        loading={resetPassword.isPending}
        onClose={() => setResetTarget(null)}
        onConfirm={handleResetPassword}
      />
    </>
  );
}
