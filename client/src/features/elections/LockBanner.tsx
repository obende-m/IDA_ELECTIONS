import { useState } from 'react';
import { Button, Icon, useToast } from '../../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useUnlockElection } from './useElection';
import { LockReasonModal } from './LockReasonModal';
import type { Election } from './types';

export interface LockBannerProps {
  election: Election;
}

/** Shown wherever a locked election would otherwise let an admin change something. */
export function LockBanner({ election }: LockBannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const unlockElection = useUnlockElection();

  if (!election.isLocked) return null;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleUnlock = async (reason: string) => {
    await unlockElection.mutateAsync(reason);
    toast({ title: 'Election unlocked', description: 'This election is editable again.', variant: 'success' });
    setModalOpen(false);
  };

  return (
    <>
      <div role="status" className="animate-fade flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-on-background text-on-primary px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-white/10 text-primary-fixed-dim flex items-center justify-center shrink-0">
            <Icon name="lock" size={18} />
          </span>
          <div>
            <p className="font-medium">Election locked — read-only</p>
            <p className="mt-0.5 text-[0.8125rem] text-on-primary/70">
              Votes, voting links, voter records, the ballot and settings cannot be changed
              {election.lockedBy ? ` · locked by ${election.lockedBy.fullName}` : ''}
              {election.lockedAt ? ` on ${new Date(election.lockedAt).toLocaleString()}` : ''}.
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <Button variant="secondary" size="sm" leftIcon="lock_open" className="shrink-0" onClick={() => setModalOpen(true)}>
            Unlock
          </Button>
        )}
      </div>

      <LockReasonModal
        open={modalOpen}
        title="Unlock election"
        actionLabel="Unlock"
        minLength={10}
        helperText="Unlocking allows records to be modified again. This action and your justification are permanently recorded in the audit log."
        loading={unlockElection.isPending}
        onClose={() => setModalOpen(false)}
        onConfirm={handleUnlock}
      />
    </>
  );
}
