import { Router } from 'express';
import * as voterController from './voter.controller';
import { validateBody, validateQuery } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { votingTokenLimiter } from '../../middleware/rateLimiter';
import { uploadSpreadsheet } from '../../middleware/upload';
import { asyncHandler } from '../../lib/asyncHandler';
import { createVoterSchema, listVotersQuerySchema, updateVoterSchema } from './voter.validation';

const router = Router();

// Public: a voter opening their personal /vote/:token link.
router.get('/token/:token/resolve', votingTokenLimiter, asyncHandler(voterController.resolveToken));

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validateQuery(listVotersQuerySchema), asyncHandler(voterController.list));
router.post('/', validateBody(createVoterSchema), asyncHandler(voterController.create));
router.post('/import', uploadSpreadsheet.single('file'), asyncHandler(voterController.importFile));
router.get('/export', asyncHandler(voterController.exportVotersCsv));
router.get('/export/links', asyncHandler(voterController.exportVotingLinksCsv));
router.get('/:id', asyncHandler(voterController.getOne));
router.patch('/:id', validateBody(updateVoterSchema), asyncHandler(voterController.update));
router.post('/:id/activate', asyncHandler(voterController.activate));
router.post('/:id/deactivate', asyncHandler(voterController.deactivate));
router.get('/:id/token/link', asyncHandler(voterController.votingLink));
router.post('/:id/token/issue', asyncHandler(voterController.issueToken));
router.post('/:id/token/revoke', asyncHandler(voterController.revokeToken));
router.post('/:id/token/replace', asyncHandler(voterController.replaceToken));

export default router;
