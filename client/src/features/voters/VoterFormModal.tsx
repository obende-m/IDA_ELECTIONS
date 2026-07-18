import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Modal } from '../../components/ui';
import { useCreateVoter, useUpdateVoter } from './useVoters';
import type { Voter } from './types';

const voterSchema = z.object({
  membershipNumber: z.string().trim().min(1, 'Membership number is required'),
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.union([z.string().trim().email('Enter a valid email address'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  ward: z.string().trim().optional(),
});

type VoterFormData = z.infer<typeof voterSchema>;

export interface VoterFormModalProps {
  open: boolean;
  onClose: () => void;
  voter?: Voter | null;
  onSuccess: (message: string) => void;
}

export function VoterFormModal({ open, onClose, voter, onSuccess }: VoterFormModalProps) {
  const isEditing = Boolean(voter);
  const createVoter = useCreateVoter();
  const updateVoter = useUpdateVoter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VoterFormData>({ resolver: zodResolver(voterSchema) });

  useEffect(() => {
    if (open) {
      reset({
        membershipNumber: voter?.membershipNumber ?? '',
        fullName: voter?.fullName ?? '',
        email: voter?.email ?? '',
        phone: voter?.phone ?? '',
        ward: voter?.ward ?? '',
      });
    }
  }, [open, voter, reset]);

  const onSubmit = async (data: VoterFormData) => {
    if (isEditing && voter) {
      await updateVoter.mutateAsync({ id: voter.id, data });
      onSuccess('Voter details updated.');
    } else {
      await createVoter.mutateAsync(data);
      onSuccess('Voter added to the roll.');
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Voter' : 'Add Voter'}>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Membership Number" placeholder="IDA-000-000" error={errors.membershipNumber?.message} {...register('membershipNumber')} />
        <Field label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
        <Field label="Email Address" type="email" error={errors.email?.message} {...register('email')} />
        <Field label="Phone Number" error={errors.phone?.message} {...register('phone')} />
        <Field label="Ward" error={errors.ward?.message} {...register('ward')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Voter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
