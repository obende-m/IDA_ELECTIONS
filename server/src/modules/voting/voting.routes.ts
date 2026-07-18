import { Router } from 'express';
import * as votingController from './voting.controller';
import { validateBody, validateQuery } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { votingTokenLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../lib/asyncHandler';
import { castVoteSchema, voteRecordsQuerySchema } from './voting.validation';

const router = Router();

// Public: the voter's own ballot, keyed by their personal token — not by any admin session.
router.get('/ballot/:token', votingTokenLimiter, asyncHandler(votingController.getBallot));
router.post('/cast/:token', votingTokenLimiter, validateBody(castVoteSchema), asyncHandler(votingController.castVote));

// Individual vote records: ELECTION_COMMITTEE or SUPER_ADMIN only, never exposed elsewhere.
router.get(
  '/records',
  requireAuth,
  requireRole('ELECTION_COMMITTEE'),
  validateQuery(voteRecordsQuerySchema),
  asyncHandler(votingController.listVoteRecords)
);

export default router;
