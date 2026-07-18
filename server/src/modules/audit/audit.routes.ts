import { Router } from 'express';
import * as auditController from './audit.controller';
import { validateQuery } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import { auditLogQuerySchema } from './audit.validation';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validateQuery(auditLogQuerySchema), asyncHandler(auditController.list));
router.get('/actions', asyncHandler(auditController.actions));

export default router;
