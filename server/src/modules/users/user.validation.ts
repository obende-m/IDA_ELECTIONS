import { z } from 'zod';

// Super Admin is deliberately excluded — the only role that can unlock a locked election, so
// creating one is left as a rare, deliberate action outside this form.
export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1, 'Full name is required'),
  role: z.enum(['ADMIN', 'ELECTION_COMMITTEE']),
  password: z.string().min(12, 'Password must be at least 12 characters long'),
});

export const resetUserPasswordSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters long'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
