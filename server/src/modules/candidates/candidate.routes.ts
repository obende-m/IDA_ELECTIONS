import { Router } from 'express';
import * as candidateController from './candidate.controller';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { uploadImage } from '../../middleware/upload';
import { asyncHandler } from '../../lib/asyncHandler';
import { createCandidateSchema, updateCandidateSchema } from './candidate.validation';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncHandler(candidateController.list));
router.post('/', validateBody(createCandidateSchema), asyncHandler(candidateController.create));
router.patch('/:id', validateBody(updateCandidateSchema), asyncHandler(candidateController.update));
router.delete('/:id', asyncHandler(candidateController.remove));
router.post('/:id/photo', uploadImage.single('photo'), asyncHandler(candidateController.uploadPhoto));
router.delete('/:id/photo', asyncHandler(candidateController.removePhoto));

export default router;
