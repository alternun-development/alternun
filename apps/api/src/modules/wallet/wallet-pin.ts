import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

// Server-side mirror of packages/wallet/src/storage/secureVault.ts's createPinDigest/verifyPin.
// Both sides must produce bit-identical output for the same PIN+salt or the server-side
// re-verification gate (00-SPEC.md §3.2) will never succeed for a correct PIN. Verified empirically
// (see .agents/active-tasks/alternun-wallet-system/02-server-wallet-module-api.md) that WebCrypto's
// PBKDF2 deriveKey (SHA-256, 210_000 iterations, 256-bit output) and Node's crypto.pbkdf2Sync with
// the same parameters produce identical bytes for the same input — both conform to the same PBKDF2
// (RFC 2898) specification, this isn't a coincidence. The client always generates its own salt
// (via createPinDigest); the server only ever verifies, never generates a PIN salt itself.
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_DIGEST = 'sha256';
const KEY_LENGTH_BYTES = 32;

export function computePinDigest(pin: string, saltBase64: string): string {
  const salt = Buffer.from(saltBase64, 'base64');
  return pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BYTES, PBKDF2_DIGEST).toString(
    'base64'
  );
}

export function verifyPinDigest(
  pin: string,
  saltBase64: string,
  expectedHashBase64: string
): boolean {
  const actual = Buffer.from(computePinDigest(pin, saltBase64), 'base64');
  const expected = Buffer.from(expectedHashBase64, 'base64');

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

// Non-secret session token for wallet_sessions.session_key — purely an "unlocked for N minutes"
// UX convenience marker, not part of the PIN digest/encryption path above.
export function generateSessionKey(): string {
  return createHash('sha256').update(randomBytes(32)).digest('hex');
}
