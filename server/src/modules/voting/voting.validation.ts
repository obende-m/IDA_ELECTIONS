import { z } from 'zod';

const selectionSchema = z.object({
  positionId: z.string().uuid(),
  candidateIds: z.array(z.string().uuid()).max(50),
});

export const castVoteSchema = z.object({
  selections: z.array(selectionSchema).min(1, 'At least one selection is required'),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;

export const voteRecordsQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(25),
});

export type VoteRecordsQuery = z.infer<typeof voteRecordsQuerySchema>;
