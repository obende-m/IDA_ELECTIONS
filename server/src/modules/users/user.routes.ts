import { Router } from 'express';
import * as userController from './user.controller';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import { changeUserRoleSchema, createUserSchema, resetUserPasswordSchema } from './user.validation';

const router = Router();

// Managing who else has administrative access is Super Admin-exclusive — same restriction level
// as unlocking a locked election.
router.use(requireAuth, requireRole('SUPER_ADMIN'));

router.get('/', asyncHandler(userController.list));
router.post('/', validateBody(createUserSchema), asyncHandler(userController.create));
router.post('/:id/activate', asyncHandler(userController.activate));
router.post('/:id/deactivate', asyncHandler(userController.deactivate));
router.patch('/:id/role', validateBody(changeUserRoleSchema), asyncHandler(userController.changeRole));
router.delete('/:id', asyncHandler(userController.remove));
router.post('/:id/reset-password', validateBody(resetUserPasswordSchema), asyncHandler(userController.resetPassword));

export default router;
