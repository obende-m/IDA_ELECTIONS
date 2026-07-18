import { Router } from 'express';
import * as reportController from './report.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

// :type in {summary, positions, participation, audit}, :format in {pdf, xlsx, csv}. All build on
// analytics.service.ts's getElectionAnalytics — see report.service.ts.
router.get('/:type/:format', asyncHandler(reportController.download));

export default router;
