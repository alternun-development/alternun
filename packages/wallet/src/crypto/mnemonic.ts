import {
  generateMnemonic as bip39GenerateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic as bip39ValidateMnemonic,
} from 'bip39';

export function generateMnemonic(strength = 128): string {
  return bip39GenerateMnemonic(strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39ValidateMnemonic(mnemonic.trim());
}

export function mnemonicToSeed(mnemonic: string, passphrase = ''): Uint8Array {
  // Uint8Array.from(...) normalizes away Buffer's pooled/shared ArrayBuffer typing, which newer
  // @types/node versions distinguish from a plain Uint8Array<ArrayBuffer> — avoids type friction
  // for every consumer of this function across packages with different @types/node versions.
  return Uint8Array.from(mnemonicToSeedSync(mnemonic.trim(), passphrase));
}
