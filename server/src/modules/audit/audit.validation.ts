import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  search: z.string().trim().optional(),
  action: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(25),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
