/* eslint-disable security/detect-object-injection */

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_HASH = 'SHA-256';
const KEY_LENGTH_BYTES = 32;

const VAULT_KEY = 'airs_encrypted_mnemonic';

type StoredVaultPayload = {
  version: 1;
  ciphertext: string;
  iv: string;
  salt: string;
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

async function resolveSecureStore(): Promise<SecureStoreAdapter> {
  const secureStore = await import('expo-secure-store');
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
  return Buffer.from(data).toString('base64');
}

function decodeBase64(data: string): Uint8Array {
  return new Uint8Array(Buffer.from(data, 'base64'));
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
  extractable = false
): Promise<CryptoKey> {
  const cryptoApi = getCrypto();
  const pinBytes = new TextEncoder().encode(pin);

  const baseKey = await cryptoApi.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveKey']);

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
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
  const key = await deriveAesKey(pin, salt, ['encrypt']);

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
  };
}

async function decryptPayload(
  payload: StoredVaultPayload,
  pin: string
): Promise<VaultRecord | null> {
  try {
    const key = await deriveAesKey(pin, decodeBase64(payload.salt), ['decrypt']);
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
