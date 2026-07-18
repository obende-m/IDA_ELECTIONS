import { useState } from 'react';
import { Button, Field, Modal } from '../../components/ui';

export interface LockReasonModalProps {
  open: boolean;
  title: string;
  actionLabel: string;
  minLength: number;
  helperText: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Shared reason-capture prompt for lock/unlock actions — both require a justification for the audit trail. */
export function LockReasonModal({ open, title, actionLabel, minLength, helperText, loading, onClose, onConfirm }: LockReasonModalProps) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= minLength;

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="space-y-5">
        <p className="text-body-md text-secondary">{helperText}</p>
        <Field
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          hint={`Minimum ${minLength} characters.`}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!isValid} loading={loading} onClick={() => onConfirm(reason.trim())}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
