import { Router } from 'express';
import * as authController from './auth.controller';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation';
import { validateBody } from '../../middleware/validate';
import { loginLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';
import { requireTrustedOrigin } from '../../middleware/csrfOrigin';
import { asyncHandler } from '../../lib/asyncHandler';

const router = Router();

router.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(authController.login));
// refresh/logout rely on the ambient refresh cookie rather than a bearer token the caller had to
// explicitly know — requireTrustedOrigin is the compensating CSRF control (see csrfOrigin.ts).
router.post('/refresh', requireTrustedOrigin, asyncHandler(authController.refresh));
router.post('/logout', requireTrustedOrigin, asyncHandler(authController.logout));
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));

export default router;
