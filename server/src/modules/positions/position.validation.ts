import { z } from 'zod';

export const createPositionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().or(z.literal('')),
  maxSelections: z.coerce.number().int().min(1).default(1),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export const updatePositionSchema = createPositionSchema.partial();

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
