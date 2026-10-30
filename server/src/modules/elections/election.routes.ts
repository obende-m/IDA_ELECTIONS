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
router.patch('/current', requireRole('ELECTION_COMMITTEE'), validateBody(updateElectionSchema), asyncHandler(electionController.update));
// Opening/pausing/closing/archiving an election (and editing its schedule) decides when voting
// happens and certifies results, so it is restricted above ordinary data-entry ADMIN accounts.
router.post('/current/open', requireRole('ELECTION_COMMITTEE'), asyncHandler(electionController.open));
router.post('/current/pause', requireRole('ELECTION_COMMITTEE'), asyncHandler(electionController.pause));
router.post('/current/resume', requireRole('ELECTION_COMMITTEE'), asyncHandler(electionController.resume));
router.post('/current/close', requireRole('ELECTION_COMMITTEE'), asyncHandler(electionController.close));
router.post('/current/archive', requireRole('ELECTION_COMMITTEE'), asyncHandler(electionController.archive));
router.post('/current/lock', requireRole('ELECTION_COMMITTEE'), validateBody(lockReasonSchema), asyncHandler(electionController.lock));
// Unlocking is the one action that requires SUPER_ADMIN specifically — requireRole('ADMIN') above
// already let ADMIN through, so this second check narrows just this route.
router.post('/current/unlock', requireRole('SUPER_ADMIN'), validateBody(unlockReasonSchema), asyncHandler(electionController.unlock));

// Multi-election create/list/switch lands if IDA ever needs more than one election running;
// everything else here is a placeholder until then.
router.all('*', notImplementedHandler('Election Management'));

export default router;
