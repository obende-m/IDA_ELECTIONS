import { z } from 'zod';

export const lockReasonSchema = z.object({
  reason: z.string().trim().min(5, 'Please provide a brief reason (at least 5 characters).'),
});

export const unlockReasonSchema = z.object({
  reason: z.string().trim().min(10, 'Please provide a justification for unlocking (at least 10 characters).'),
});

export type LockReasonInput = z.infer<typeof lockReasonSchema>;
export type UnlockReasonInput = z.infer<typeof unlockReasonSchema>;
