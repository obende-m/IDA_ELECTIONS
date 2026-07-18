import { Router } from 'express';
import * as resultsController from './results.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncHandler(resultsController.get));
// Recomputes the tally tables from raw Vote rows — a drift-repair safety valve, restricted to
// SUPER_ADMIN the same way election unlock is (requireRole('ADMIN') above already lets ADMIN
// through; this narrows just this one route).
router.post('/reconcile', requireRole('SUPER_ADMIN'), asyncHandler(resultsController.reconcile));

export default router;
