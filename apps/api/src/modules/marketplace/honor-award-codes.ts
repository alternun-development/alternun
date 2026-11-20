import { createHash, randomBytes } from 'node:crypto';

/**
 * Claim codes of honor awards: 12 characters of Crockford base32 (60 random bits), shown as
 * XXXX-XXXX-XXXX. Only the SHA-256 of the normalized code is stored.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 12;

/** A new random code, e.g. "7K2M-QX9D-4HVT". */
export function generateClaimCode(): string {
  const bytes = randomBytes(LENGTH);
  let code = '';
  // 256 is a multiple of 32, so taking each byte modulo 32 keeps every character equally likely.
  for (const byte of bytes) code += ALPHABET.charAt(byte % 32);
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}

/**
 * What a person typed, as stored: upper case, no spaces or dashes, and the letters people
 * confuse read as digits (O → 0, I and L → 1). Null when it cannot be a code.
 */
export function normalizeClaimCode(input: string): string | null {
  if (typeof input !== 'string' || input.length > 64) return null;
  const normalized = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (normalized.length !== LENGTH) return null;
  for (const char of normalized) if (!ALPHABET.includes(char)) return null;
  return normalized;
}

export function hashClaimCode(normalized: string): string {
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/** The last four characters, to tell codes apart in the list. */
export function claimCodeHint(normalized: string): string {
  return normalized.slice(-4);
}
