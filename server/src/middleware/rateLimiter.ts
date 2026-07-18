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

/** Throttles brute-force guessing of voting tokens on any public /vote/:token-adjacent endpoint (resolve, ballot, cast). */
export const votingTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
