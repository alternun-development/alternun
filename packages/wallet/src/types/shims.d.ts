// Hand-rolled type shims for packages that ship no .d.ts of their own.
// @scure/bip32, @scure/btc-signer, @noble/hashes ship real types — no shims needed for those.
// expo-secure-store also ships real types (declared as devDependency/peerDependency).

declare module 'bip39' {
  export function generateMnemonic(strength?: number): string;
  export function mnemonicToSeedSync(mnemonic: string, password?: string): Uint8Array;
  export function validateMnemonic(mnemonic: string): boolean;
}

declare module 'viem/accounts' {
  export function mnemonicToAccount(
    mnemonic: string,
    options: { path: string }
  ): {
    address: `0x${string}`;
  };
}

declare module '@solana/web3.js' {
  export class Keypair {
    static fromSeed(seed: Uint8Array): Keypair;
    publicKey: { toBase58(): string };
    secretKey: Uint8Array;
  }
}

declare module 'ed25519-hd-key' {
  export function derivePath(path: string, seedHex: string): { key: Uint8Array };
}

declare module 'bs58' {
  const bs58: {
    encode(input: Uint8Array): string;
  };
  export default bs58;
}
