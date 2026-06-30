import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha2';

// SLIP-0010 ed25519 HD derivation (https://github.com/satoshilabs/slips/blob/master/slip-0010.md),
// reimplemented Buffer-free in place of the `ed25519-hd-key` package: that package's
// `getMasterKeyFromSeed`/`CKDPriv` call `Buffer.from(...)` internally with no browser fallback,
// which throws "Buffer is not defined" in Hermes/browser environments (the same class of bug
// fixed in bitcoinDerive.ts/solanaDerive.ts/mnemonic.ts). ed25519 SLIP-0010 only supports
// hardened derivation, matching this wallet's fully-hardened Solana path (m/44'/501'/x'/0').

const ED25519_SEED_KEY = new TextEncoder().encode('ed25519 seed');
const HARDENED_OFFSET = 0x80000000;

type HdNode = { key: Uint8Array; chainCode: Uint8Array };

function getMasterKeyFromSeed(seed: Uint8Array): HdNode {
  const I = hmac(sha512, ED25519_SEED_KEY, seed);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function ckdPriv({ key, chainCode }: HdNode, index: number): HdNode {
  const data = new Uint8Array(1 + 32 + 4);
  data.set(key, 1);
  new DataView(data.buffer).setUint32(33, index, false); // big-endian, matches Buffer.writeUInt32BE
  const I = hmac(sha512, chainCode, data);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function parseHardenedPath(path: string): number[] {
  if (!/^m(\/[0-9]+')+$/.test(path)) {
    throw new Error(`Invalid fully-hardened derivation path: ${path}`);
  }
  return path
    .split('/')
    .slice(1)
    .map((segment) => parseInt(segment.replace("'", ''), 10) + HARDENED_OFFSET);
}

export function derivePath(path: string, seed: Uint8Array): HdNode {
  let node = getMasterKeyFromSeed(seed);
  for (const index of parseHardenedPath(path)) {
    node = ckdPriv(node, index);
  }
  return node;
}
