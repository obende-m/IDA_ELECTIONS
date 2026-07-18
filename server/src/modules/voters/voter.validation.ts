import { z } from 'zod';

export const createVoterSchema = z.object({
  membershipNumber: z.string().trim().min(1, 'Membership number is required'),
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  ward: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const updateVoterSchema = createVoterSchema.partial();

export const listVotersQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  votingStatus: z.enum(['NOT_ISSUED', 'ISSUED', 'VOTED', 'REVOKED']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(25),
});

export type CreateVoterInput = z.infer<typeof createVoterSchema>;
export type UpdateVoterInput = z.infer<typeof updateVoterSchema>;
export type ListVotersQuery = z.infer<typeof listVotersQuerySchema>;
