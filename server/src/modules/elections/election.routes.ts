import { Router } from 'express';
import * as electionController from './election.controller';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import { notImplementedHandler } from '../../lib/notImplemented';
import { lockReasonSchema, unlockReasonSchema, updateElectionSchema } from './election.validation';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/current', asyncHandler(electionController.getCurrent));
router.patch('/current', validateBody(updateElectionSchema), asyncHandler(electionController.update));
router.post('/current/open', asyncHandler(electionController.open));
router.post('/current/pause', asyncHandler(electionController.pause));
router.post('/current/resume', asyncHandler(electionController.resume));
router.post('/current/close', asyncHandler(electionController.close));
router.post('/current/archive', asyncHandler(electionController.archive));
router.post('/current/lock', validateBody(lockReasonSchema), asyncHandler(electionController.lock));
// Unlocking is the one action that requires SUPER_ADMIN specifically — requireRole('ADMIN') above
// already let ADMIN through, so this second check narrows just this route.
router.post('/current/unlock', requireRole('SUPER_ADMIN'), validateBody(unlockReasonSchema), asyncHandler(electionController.unlock));

// Multi-election create/list/switch lands if IDA ever needs more than one election running;
// everything else here is a placeholder until then.
router.all('*', notImplementedHandler('Election Management'));

export default router;
