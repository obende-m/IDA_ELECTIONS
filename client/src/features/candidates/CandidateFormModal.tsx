import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Icon, Modal, SelectField } from '../../components/ui';
import { usePositionsList } from '../../features/positions/usePositions';
import { cn } from '../../lib/cn';
import { useCreateCandidate, useRemoveCandidatePhoto, useUpdateCandidate, useUploadCandidatePhoto } from './useCandidates';
import type { Candidate } from './types';

const candidateSchema = z.object({
  positionId: z.string().min(1, 'Select a position'),
  name: z.string().trim().min(1, 'Name is required'),
  bio: z.string().trim().optional(),
});

type CandidateFormData = z.infer<typeof candidateSchema>;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

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
  const uploadPhoto = useUploadCandidatePhoto();
  const removePhoto = useRemoveCandidatePhoto();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removeRequested, setRemoveRequested] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      });
      setPhotoFile(null);
      setPhotoError(null);
      setRemoveRequested(false);
    }
  }, [open, candidate, defaultPositionId, reset]);

  const previewUrl = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile);
    if (removeRequested) return null;
    return candidate?.photoUrl ?? null;
  }, [photoFile, removeRequested, candidate?.photoUrl]);

  useEffect(() => {
    return () => {
      if (photoFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [photoFile, previewUrl]);

  const stageFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError('Only JPG, PNG, or WEBP images are accepted.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setPhotoError('Image must be 5MB or smaller.');
      return;
    }
    setPhotoError(null);
    setRemoveRequested(false);
    setPhotoFile(file);
  };

  const onSubmit = async (data: CandidateFormData) => {
    let candidateId: string;
    if (isEditing && candidate) {
      await updateCandidate.mutateAsync({ id: candidate.id, data });
      candidateId = candidate.id;
    } else {
      const created = await createCandidate.mutateAsync(data);
      candidateId = created.candidate.id;
    }

    if (photoFile) {
      await uploadPhoto.mutateAsync({ id: candidateId, file: photoFile });
    } else if (removeRequested) {
      await removePhoto.mutateAsync(candidateId);
    }

    onSuccess(isEditing ? 'Candidate updated.' : 'Candidate added.');
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

        <div className="space-y-2">
          <label className="block text-label-md font-label-md text-on-background uppercase">Ballot Photo</label>
          {previewUrl ? (
            <div className="relative w-full h-48 border-2 border-on-background overflow-hidden group">
              <img src={previewUrl} alt="Candidate preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setRemoveRequested(true);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 bg-on-background text-on-primary p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) stageFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 bg-surface-container-lowest cursor-pointer transition-colors',
                dragActive ? 'border-primary' : 'border-outline'
              )}
            >
              <Icon name="cloud_upload" size={36} className="text-primary" />
              <p className="text-label-md font-label-md uppercase tracking-wide">Drag Image or Click to Browse</p>
              <p className="text-label-sm font-label-sm text-secondary">Accepted formats: JPG, PNG, WEBP. Max 5MB.</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) stageFile(file);
            }}
          />
          {photoError && <p className="text-label-sm font-label-sm text-error">{photoError}</p>}
        </div>

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
