import {
  generateMnemonic as scureGenerateMnemonic,
  mnemonicToSeedSync as scureMnemonicToSeedSync,
  validateMnemonic as scureValidateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

// @scure/bip39 (not `bip39`) — same BIP-39 algorithm and wordlist, but `bip39`'s default RNG
// wraps bytes in a Node.js `Buffer` internally with no browser fallback, which throws
// "Buffer is not defined" in Hermes/browser environments (the same class of bug fixed in
// bitcoinDerive.ts/solanaDerive.ts). @scure/bip39 is pure Uint8Array, zero Node.js globals.

export function generateMnemonic(strength = 128): string {
  return scureGenerateMnemonic(wordlist, strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return scureValidateMnemonic(mnemonic.trim(), wordlist);
}

export function mnemonicToSeed(mnemonic: string, passphrase = ''): Uint8Array {
  return scureMnemonicToSeedSync(mnemonic.trim(), passphrase);
}
