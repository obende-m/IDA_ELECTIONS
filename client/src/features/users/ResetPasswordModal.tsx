import { useState } from 'react';
import { Button, Field, Modal } from '../../components/ui';

export interface ResetPasswordModalProps {
  open: boolean;
  fullName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

/** Sets a new password directly for an existing admin account — also invalidates their sessions server-side. */
export function ResetPasswordModal({ open, fullName, loading, onClose, onConfirm }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const isValid = password.length >= 12;

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Reset Password — ${fullName}`}>
      <div className="space-y-5">
        <p className="text-body-md text-secondary">
          This immediately replaces their password and signs them out everywhere. Share the new password with them
          directly.
        </p>
        <Field
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 12 characters."
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!isValid} loading={loading} onClick={() => onConfirm(password)}>
            Reset Password
          </Button>
        </div>
      </div>
    </Modal>
  );
}
