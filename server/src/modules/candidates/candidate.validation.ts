import { z } from 'zod';

export const createCandidateSchema = z.object({
  positionId: z.string().uuid('A valid position must be selected'),
  name: z.string().trim().min(1, 'Name is required'),
  bio: z.string().trim().optional().or(z.literal('')),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export const updateCandidateSchema = createCandidateSchema.partial();

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
