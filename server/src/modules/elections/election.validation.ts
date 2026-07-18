import { z } from 'zod';

export const upsertElectionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  year: z.coerce.number().int().min(2000).max(2200),
  description: z.string().trim().optional().or(z.literal('')),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
});

export const updateElectionSchema = upsertElectionSchema.partial();

export const lockReasonSchema = z.object({
  reason: z.string().trim().min(5, 'Please provide a brief reason (at least 5 characters).'),
});

export const unlockReasonSchema = z.object({
  reason: z.string().trim().min(10, 'Please provide a justification for unlocking (at least 10 characters).'),
});

export type UpsertElectionInput = z.infer<typeof upsertElectionSchema>;
export type UpdateElectionInput = z.infer<typeof updateElectionSchema>;
export type LockReasonInput = z.infer<typeof lockReasonSchema>;
export type UnlockReasonInput = z.infer<typeof unlockReasonSchema>;
