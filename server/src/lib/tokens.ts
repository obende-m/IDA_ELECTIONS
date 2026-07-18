import crypto from 'crypto';

/** Opaque high-entropy token for refresh tokens / voting tokens; only the hash is ever persisted. */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
