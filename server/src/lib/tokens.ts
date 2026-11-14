import crypto from 'crypto';

/** Opaque high-entropy token for refresh tokens / voting tokens; only the hash is ever persisted. */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Voting-link token: 32 random bytes (256 bits) as base64url, 43 characters. Shorter than
 * generateOpaqueToken()'s 96 hex chars so the whole SMS invite fits in one 160-character segment;
 * still far beyond guessable. Links issued earlier (96 hex chars) keep working: lookup is by hash.
 */
export function generateVotingToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
