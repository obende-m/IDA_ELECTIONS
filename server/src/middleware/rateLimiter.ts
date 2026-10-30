import rateLimit from 'express-rate-limit';

/** Throttles credential-guessing on login: 10 attempts per 15 minutes per IP. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', statusCode: 429, message: 'Too many login attempts. Please try again later.' },
});

/** Throttles password-reset request spam: 5 per hour per IP. */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', statusCode: 429, message: 'Too many password reset requests. Please try again later.' },
});

/**
 * Throttles brute-force guessing of voting tokens on any public /vote/:token-adjacent endpoint
 * (resolve, ballot, cast). Tokens are 48 random bytes, so guessing is infeasible well below this
 * limit; it is set high because many voters can share one public IP (mobile carrier NAT, a
 * voting hall's Wi-Fi) and each voter makes ~3 calls.
 */
export const votingTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
