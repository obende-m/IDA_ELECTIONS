import { Router } from 'express';
import * as authController from './auth.controller';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation';
import { validateBody } from '../../middleware/validate';
import { loginLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../lib/asyncHandler';

const router = Router();

router.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));

export default router;
