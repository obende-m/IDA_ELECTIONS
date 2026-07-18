import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Modal, SelectField } from '../../components/ui';
import { useCreateUser } from './useUsers';

const userSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  fullName: z.string().trim().min(1, 'Full name is required'),
  role: z.enum(['ADMIN', 'ELECTION_COMMITTEE']),
  password: z.string().min(12, 'Password must be at least 12 characters long'),
});

type UserFormData = z.infer<typeof userSchema>;

export interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

/** Create-only — Super Admin accounts stay a deliberate, rare action outside this form (see user.validation.ts). */
export function UserFormModal({ open, onClose, onSuccess }: UserFormModalProps) {
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({ resolver: zodResolver(userSchema), defaultValues: { role: 'ADMIN' } });

  useEffect(() => {
    if (open) reset({ email: '', fullName: '', role: 'ADMIN', password: '' });
  }, [open, reset]);

  const onSubmit = async (data: UserFormData) => {
    await createUser.mutateAsync(data);
    onSuccess(`${data.fullName}'s account was created.`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Admin Account">
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
        <Field label="Email Address" type="email" error={errors.email?.message} {...register('email')} />
        <SelectField label="Role" error={errors.role?.message} {...register('role')}>
          <option value="ADMIN">Admin</option>
          <option value="ELECTION_COMMITTEE">Election Committee</option>
        </SelectField>
        <Field
          label="Initial Password"
          type="password"
          hint="At least 12 characters. Share it with them directly — there's no email delivery yet."
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Create Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
