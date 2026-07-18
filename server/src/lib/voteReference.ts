import crypto from 'crypto';

// Excludes visually ambiguous characters (0/O, 1/I/L) since this is read aloud/copied by voters.
const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** One reference number per ballot submission (shared across every position a voter voted on), shown to the voter as their receipt. */
export function generateVoteReferenceNumber(): string {
  const randomChars = Array.from(crypto.randomBytes(12))
    .map((byte) => SAFE_ALPHABET[byte % SAFE_ALPHABET.length])
    .join('');
  return `IDA-${randomChars.slice(0, 4)}-${randomChars.slice(4, 8)}-${randomChars.slice(8, 12)}`;
}
