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
  return mnemonicToSeedSync(mnemonic.trim(), passphrase);
}
