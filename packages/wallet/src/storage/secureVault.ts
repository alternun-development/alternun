/* eslint-disable security/detect-object-injection */
import { base64ToBytes, bytesToBase64 } from './base64';

// PIN_DIGEST_ITERATIONS must stay in sync with apps/api/src/modules/wallet/wallet-pin.ts's
// server-side mirror (createPinDigest/verifyPin) — changing it requires a coordinated server
// change, since the server only verifies against this fixed iteration count.
const PIN_DIGEST_ITERATIONS = 210_000;
// VAULT_PBKDF2_ITERATIONS protects the locally-stored encrypted mnemonic specifically — this one
// is *not* shared with the server and can be raised independently. 600_000 matches OWASP's current
// (2023) PBKDF2-SHA256 recommendation. This matters more on web than native: a stolen
// `localStorage` vault blob (e.g. via XSS) can be brute-forced fully offline with no rate limit at
// all (unlike the server-verified PIN digest, which is lockout-protected) — measured empirically
// at ~17 minutes single-threaded to exhaust all 10,000 4-digit PINs at 210k iterations; raising to
// 600k roughly triples that cost. Stored per-payload (not just bumped in place) so existing vaults
// encrypted at the old iteration count still decrypt correctly — see `iterations` on
// StoredVaultPayload and its `?? PIN_DIGEST_ITERATIONS` fallback in decryptPayload.
const VAULT_PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = 'SHA-256';
const KEY_LENGTH_BYTES = 32;

const VAULT_KEY = 'airs_encrypted_mnemonic';

type StoredVaultPayload = {
  version: 1;
  ciphertext: string;
  iv: string;
  salt: string;
  /** PBKDF2 iteration count used for this specific payload. Absent on payloads written before
   * this field existed — treat as PIN_DIGEST_ITERATIONS (210_000, the original hardcoded value)
   * for those. */
  iterations?: number;
};

export type VaultRecord = {
  mnemonic: string;
  createdAt: string;
};

export type SecureStoreAdapter = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

function createLocalStorageAdapter(): SecureStoreAdapter {
  return {
    getItemAsync(key) {
      return Promise.resolve(
        typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
      );
    },
    setItemAsync(key, value) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return Promise.resolve();
    },
    deleteItemAsync(key) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return Promise.resolve();
    },
  };
}

async function resolveSecureStore(): Promise<SecureStoreAdapter> {
  const secureStore = await import('expo-secure-store');

  // expo-secure-store's public setItemAsync/getItemAsync/deleteItemAsync are always real JS
  // functions on every platform — they just delegate to a native module
  // (setValueWithKeyAsync/getValueWithKeyAsync/...) that doesn't exist on web (the web build of
  // that native module is a no-op `{}`, since there's no Keychain/Keystore equivalent there).
  // So checking `typeof secureStore.setItemAsync === 'function'` never detects the web case — it
  // throws "ExpoSecureStore.default.setValueWithKeyAsync is not a function" only once actually
  // called. isAvailableAsync() checks the underlying native module directly
  // (`!!ExpoSecureStore.getValueWithKeyAsync`), which is the correct check.
  const available = await secureStore.isAvailableAsync().catch(() => false);
  if (!available) {
    // The payload reaching this adapter is already PBKDF2+AES-GCM encrypted (see encryptPayload
    // above), so localStorage is an acceptable fallback for the web target — it never stores the
    // raw mnemonic.
    return createLocalStorageAdapter();
  }

  return {
    getItemAsync: secureStore.getItemAsync,
    setItemAsync: secureStore.setItemAsync,
    deleteItemAsync: secureStore.deleteItemAsync,
  };
}

function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto;
  }

  throw new Error('Web Crypto API is not available in this runtime.');
}

function encodeBase64(data: Uint8Array): string {
  return bytesToBase64(data);
}

function decodeBase64(data: string): Uint8Array {
  return base64ToBytes(data);
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

async function deriveAesKey(
  pin: string,
  salt: Uint8Array,
  usage: KeyUsage[],
  extractable = false,
  iterations: number = PIN_DIGEST_ITERATIONS
): Promise<CryptoKey> {
  const cryptoApi = getCrypto();
  const pinBytes = new TextEncoder().encode(pin);

  const baseKey = await cryptoApi.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveKey']);

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: PBKDF2_HASH,
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH_BYTES * 8,
    },
    extractable,
    usage
  );
}

async function encryptPayload(payload: VaultRecord, pin: string): Promise<StoredVaultPayload> {
  const cryptoApi = getCrypto();
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(pin, salt, ['encrypt'], false, VAULT_PBKDF2_ITERATIONS);

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await cryptoApi.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintext
  );

  return {
    version: 1,
    ciphertext: encodeBase64(new Uint8Array(encrypted)),
    iv: encodeBase64(iv),
    salt: encodeBase64(salt),
    iterations: VAULT_PBKDF2_ITERATIONS,
  };
}

async function decryptPayload(
  payload: StoredVaultPayload,
  pin: string
): Promise<VaultRecord | null> {
  try {
    const iterations = payload.iterations ?? PIN_DIGEST_ITERATIONS;
    const key = await deriveAesKey(pin, decodeBase64(payload.salt), ['decrypt'], false, iterations);
    const decrypted = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: decodeBase64(payload.iv) as BufferSource,
      },
      key,
      decodeBase64(payload.ciphertext) as BufferSource
    );

    const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as VaultRecord;
    if (typeof parsed.mnemonic !== 'string' || typeof parsed.createdAt !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function storeMnemonic(
  pin: string,
  mnemonic: string,
  adapter?: SecureStoreAdapter
): Promise<void> {
  const payload = await encryptPayload(
    {
      mnemonic,
      createdAt: new Date().toISOString(),
    },
    pin
  );

  const secureStore = adapter ?? (await resolveSecureStore());
  await secureStore.setItemAsync(VAULT_KEY, JSON.stringify(payload));
}

export async function unlockMnemonic(
  pin: string,
  adapter?: SecureStoreAdapter
): Promise<string | null> {
  const secureStore = adapter ?? (await resolveSecureStore());
  const encodedPayload = await secureStore.getItemAsync(VAULT_KEY);

  if (!encodedPayload) {
    return null;
  }

  const payload = JSON.parse(encodedPayload) as StoredVaultPayload;
  const record = await decryptPayload(payload, pin);

  return record?.mnemonic ?? null;
}

export async function clearMnemonic(adapter?: SecureStoreAdapter): Promise<void> {
  const secureStore = adapter ?? (await resolveSecureStore());
  await secureStore.deleteItemAsync(VAULT_KEY);
}

export async function createPinDigest(pin: string): Promise<{ salt: string; hash: string }> {
  const cryptoApi = getCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveAesKey(pin, salt, ['encrypt'], true);
  const raw = await cryptoApi.subtle.exportKey('raw', derivedKey);
  return {
    salt: encodeBase64(salt),
    hash: encodeBase64(new Uint8Array(raw)),
  };
}

export async function verifyPin(
  pin: string,
  saltBase64: string,
  expectedHashBase64: string
): Promise<boolean> {
  const cryptoApi = getCrypto();
  const derivedKey = await deriveAesKey(pin, decodeBase64(saltBase64), ['encrypt'], true);
  const raw = await cryptoApi.subtle.exportKey('raw', derivedKey);

  const expected = decodeBase64(expectedHashBase64);
  const actual = new Uint8Array(raw);

  if (expected.length !== actual.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected[i] ^ actual[i];
  }

  return mismatch === 0;
}

export function wipeBytes(bytes: Uint8Array): void {
  bytes.fill(0);
}

export function combineForAad(...chunks: Uint8Array[]): Uint8Array {
  return chunks.reduce((acc, chunk) => concatBytes(acc, chunk), new Uint8Array());
}
