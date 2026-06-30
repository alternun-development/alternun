import { scryptAsync } from '@noble/hashes/scrypt';
import { keccak256 } from 'viem';

// Alternun's own encrypted backup envelope, modeled on the Ethereum "V3" keystore structure
// (scrypt KDF + AES-128-CTR + keccak256 MAC) but carrying the BIP-39 mnemonic as the payload,
// not a single chain's raw private key. This is a deliberate difference from a literal geth/
// MyEtherWallet keystore file: this wallet is multi-chain (EVM + Bitcoin + Solana), and the
// mnemonic is what recovers every chain via deriveWalletBundle(). A true single-chain V3
// keystore (e.g. just the EVM account, importable directly into MetaMask/geth) is a possible
// follow-up, not implemented here — exporting only one chain's key would silently lose the
// ability to recover the others.

const SCRYPT_N = 4096; // geth's "light" scrypt params: fast enough for mobile (~tens of ms), still a real KDF.
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_DKLEN = 32;
const AES_KEY_BYTES = 16; // first 16 bytes of the scrypt output, matches V3 keystore convention.
const MAC_KEY_OFFSET = 16; // remaining 16 bytes (16:32) are used for the MAC, per V3 convention.
const IV_BYTES = 16;

export interface AlternunKeystoreV1 {
  alternunKeystoreVersion: 1;
  createdAt: string;
  crypto: {
    cipher: 'aes-128-ctr';
    ciphertext: string;
    cipherparams: { iv: string };
    kdf: 'scrypt';
    kdfparams: {
      dklen: number;
      n: number;
      r: number;
      p: number;
      salt: string;
    };
    mac: string;
  };
}

function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not available in this runtime.');
}

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function fromHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

async function deriveScryptKey(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  return scryptAsync(new TextEncoder().encode(pin), salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: SCRYPT_DKLEN,
  });
}

async function aesCtrTransform(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array
): Promise<Uint8Array> {
  const cryptoApi = getCrypto();
  const key = await cryptoApi.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-CTR' },
    false,
    ['encrypt', 'decrypt']
  );

  // AES-CTR is its own inverse for a given keystream, but WebCrypto exposes separate
  // encrypt/decrypt entry points — both are valid here, encrypt is used for both directions
  // since CTR mode XORs the keystream regardless of "direction".
  const result = await cryptoApi.subtle.encrypt(
    { name: 'AES-CTR', counter: iv as BufferSource, length: 128 },
    key,
    data as BufferSource
  );

  return new Uint8Array(result);
}

export async function exportMnemonicKeystore(
  pin: string,
  mnemonic: string
): Promise<AlternunKeystoreV1> {
  const cryptoApi = getCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(32));
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_BYTES));

  const derivedKey = await deriveScryptKey(pin, salt);
  const aesKey = derivedKey.slice(0, AES_KEY_BYTES);
  const macKey = derivedKey.slice(MAC_KEY_OFFSET, SCRYPT_DKLEN);

  const plaintext = new TextEncoder().encode(mnemonic.trim());
  const ciphertext = await aesCtrTransform(aesKey, iv, plaintext);

  const macInput = new Uint8Array(macKey.length + ciphertext.length);
  macInput.set(macKey, 0);
  macInput.set(ciphertext, macKey.length);
  const mac = keccak256(macInput).slice(2); // keccak256() returns "0x..."; store raw hex.

  return {
    alternunKeystoreVersion: 1,
    createdAt: new Date().toISOString(),
    crypto: {
      cipher: 'aes-128-ctr',
      ciphertext: toHex(ciphertext),
      cipherparams: { iv: toHex(iv) },
      kdf: 'scrypt',
      kdfparams: {
        dklen: SCRYPT_DKLEN,
        n: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        salt: toHex(salt),
      },
      mac,
    },
  };
}

export async function importMnemonicKeystore(
  pin: string,
  keystore: AlternunKeystoreV1
): Promise<string | null> {
  if (keystore.alternunKeystoreVersion !== 1 || keystore.crypto.kdf !== 'scrypt') {
    return null;
  }

  const { kdfparams, cipherparams, ciphertext, mac } = keystore.crypto;
  const salt = fromHex(kdfparams.salt);
  const iv = fromHex(cipherparams.iv);
  const ciphertextBytes = fromHex(ciphertext);

  const derivedKey = await scryptAsync(new TextEncoder().encode(pin), salt, {
    N: kdfparams.n,
    r: kdfparams.r,
    p: kdfparams.p,
    dkLen: kdfparams.dklen,
  });
  const aesKey = derivedKey.slice(0, AES_KEY_BYTES);
  const macKey = derivedKey.slice(MAC_KEY_OFFSET, kdfparams.dklen);

  const macInput = new Uint8Array(macKey.length + ciphertextBytes.length);
  macInput.set(macKey, 0);
  macInput.set(ciphertextBytes, macKey.length);
  const expectedMac = keccak256(macInput).slice(2);

  if (expectedMac.toLowerCase() !== mac.toLowerCase()) {
    return null; // wrong PIN or corrupted/tampered file.
  }

  const plaintext = await aesCtrTransform(aesKey, iv, ciphertextBytes);
  return new TextDecoder().decode(plaintext).trim();
}
