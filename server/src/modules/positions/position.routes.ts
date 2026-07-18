import { Router } from 'express';
import * as positionController from './position.controller';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import { createPositionSchema, updatePositionSchema } from './position.validation';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncHandler(positionController.list));
router.post('/', validateBody(createPositionSchema), asyncHandler(positionController.create));
router.patch('/:id', validateBody(updatePositionSchema), asyncHandler(positionController.update));
router.delete('/:id', asyncHandler(positionController.remove));

export default router;
