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
  onConfirm: (reason: string) => void | Promise<void>;
}

/** Shared reason-capture prompt for lock/unlock actions: both require a justification for the audit trail. */
export function LockReasonModal({ open, title, actionLabel, minLength, helperText, loading, onClose, onConfirm }: LockReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isValid = reason.trim().length >= minLength;

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason('');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid && !loading) void handleConfirm();
        }}
      >
        <p className="text-body-md text-secondary">{helperText}</p>
        <Field
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          hint={`Minimum ${minLength} characters.`}
        />
        {error && (
          <p role="alert" className="text-label-md font-label-md text-error">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!isValid} loading={loading}>
            {actionLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
