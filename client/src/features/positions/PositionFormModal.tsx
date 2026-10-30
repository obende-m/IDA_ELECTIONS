import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Modal, FormError } from '../../components/ui';
import { useCreatePosition, useUpdatePosition } from './usePositions';
import type { Position } from './types';

const positionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional(),
  maxSelections: z.coerce.number().int().min(1, 'Must allow at least 1 selection'),
});

type PositionFormData = z.infer<typeof positionSchema>;

export interface PositionFormModalProps {
  open: boolean;
  onClose: () => void;
  position?: Position | null;
  onSuccess: (message: string) => void;
}

export function PositionFormModal({ open, onClose, position, onSuccess }: PositionFormModalProps) {
  const isEditing = Boolean(position);
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PositionFormData>({ resolver: zodResolver(positionSchema) });

  useEffect(() => {
    if (open) {
      reset({
        title: position?.title ?? '',
        description: position?.description ?? '',
        maxSelections: position?.maxSelections ?? 1,
      });
    }
  }, [open, position, reset]);

  useEffect(() => {
    if (open) setSubmitError(null);
  }, [open]);

  const submit = async (data: PositionFormData) => {
    if (isEditing && position) {
      await updatePosition.mutateAsync({ id: position.id, data });
      onSuccess('Position updated.');
    } else {
      await createPosition.mutateAsync(data);
      onSuccess('Position added.');
    }
    onClose();
  };

  const onSubmit = async (data: Parameters<typeof submit>[0]) => {
    setSubmitError(null);
    try {
      await submit(data);
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Position' : 'Add Position'}>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Position Title" placeholder="e.g. Chairman" error={errors.title?.message} {...register('title')} />
        <Field label="Description" error={errors.description?.message} {...register('description')} />
        <Field
          label="Max Selections"
          type="number"
          min={1}
          hint="How many candidates a voter may select for this position."
          error={errors.maxSelections?.message}
          {...register('maxSelections')}
        />
        <FormError message={submitError} />
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Position'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
