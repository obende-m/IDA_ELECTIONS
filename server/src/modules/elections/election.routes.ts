import { Router } from 'express';
import * as electionController from './election.controller';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import { notImplementedHandler } from '../../lib/notImplemented';
import { lockReasonSchema, unlockReasonSchema } from './election.validation';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/current', asyncHandler(electionController.getCurrent));
router.post('/current/close', asyncHandler(electionController.close));
router.post('/current/lock', validateBody(lockReasonSchema), asyncHandler(electionController.lock));
// Unlocking is the one action that requires SUPER_ADMIN specifically — requireRole('ADMIN') above
// already let ADMIN through, so this second check narrows just this route.
router.post('/current/unlock', requireRole('SUPER_ADMIN'), validateBody(unlockReasonSchema), asyncHandler(electionController.unlock));

// Full election lifecycle CRUD (create, list, configure, open, pause, resume, archive) lands with
// the Election Management module; everything else here is a placeholder until then.
router.all('*', notImplementedHandler('Election Management'));

export default router;
