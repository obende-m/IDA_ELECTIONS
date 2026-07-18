import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Modal, SelectField } from '../../components/ui';
import { usePositionsList } from '../../features/positions/usePositions';
import { useCreateCandidate, useUpdateCandidate } from './useCandidates';
import type { Candidate } from './types';

const candidateSchema = z.object({
  positionId: z.string().min(1, 'Select a position'),
  name: z.string().trim().min(1, 'Name is required'),
  bio: z.string().trim().optional(),
  photoUrl: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]).optional(),
});

type CandidateFormData = z.infer<typeof candidateSchema>;

export interface CandidateFormModalProps {
  open: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
  defaultPositionId?: string;
  onSuccess: (message: string) => void;
}

export function CandidateFormModal({ open, onClose, candidate, defaultPositionId, onSuccess }: CandidateFormModalProps) {
  const isEditing = Boolean(candidate);
  const { data: positionsData } = usePositionsList();
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CandidateFormData>({ resolver: zodResolver(candidateSchema) });

  useEffect(() => {
    if (open) {
      reset({
        positionId: candidate?.positionId ?? defaultPositionId ?? '',
        name: candidate?.name ?? '',
        bio: candidate?.bio ?? '',
        photoUrl: candidate?.photoUrl ?? '',
      });
    }
  }, [open, candidate, defaultPositionId, reset]);

  const onSubmit = async (data: CandidateFormData) => {
    if (isEditing && candidate) {
      await updateCandidate.mutateAsync({ id: candidate.id, data });
      onSuccess('Candidate updated.');
    } else {
      await createCandidate.mutateAsync(data);
      onSuccess('Candidate added.');
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Candidate' : 'Add Candidate'}>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <SelectField label="Position" error={errors.positionId?.message} {...register('positionId')}>
          <option value="">Select a position…</option>
          {positionsData?.positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </SelectField>
        <Field label="Full Name" error={errors.name?.message} {...register('name')} />
        <Field label="Manifesto / Bio" error={errors.bio?.message} {...register('bio')} />
        <Field
          label="Photo URL"
          placeholder="https://…"
          hint="Direct upload is a future enhancement — paste a hosted image URL for now."
          error={errors.photoUrl?.message}
          {...register('photoUrl')}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Candidate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
