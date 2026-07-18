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
    toast({ title: 'Election unlocked', description: 'This election is now editable again.', variant: 'success' });
    setModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-on-background text-on-primary border-2 border-error px-6 py-4">
        <div className="flex items-start gap-3">
          <Icon name="lock" filled className="text-error shrink-0" />
          <div>
            <p className="text-label-md font-label-md uppercase tracking-widest text-error">Election Locked</p>
            <p className="text-body-md text-secondary-fixed">
              No votes, tokens, voter records, candidates, or election settings can be changed
              {election.lockedBy ? ` — locked by ${election.lockedBy.fullName}` : ''}
              {election.lockedAt ? ` on ${new Date(election.lockedAt).toLocaleString()}` : ''}.
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setModalOpen(true)}>
            Unlock Election
          </Button>
        )}
      </div>

      <LockReasonModal
        open={modalOpen}
        title="Unlock Election"
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
