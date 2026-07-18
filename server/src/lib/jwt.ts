import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  role: 'ADMIN' | 'ELECTION_COMMITTEE' | 'SUPER_ADMIN';
  fullName: string;
}

const ACCESS_TOKEN_TTL = '15m';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getSecret()) as AccessTokenPayload;
}
