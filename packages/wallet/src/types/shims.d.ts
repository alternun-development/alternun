declare const Buffer: {
  from(
    input: string | ArrayBuffer | ArrayBufferView,
    encoding?: string
  ): {
    toString(encoding?: string): string;
  } & Uint8Array;
};

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

declare module 'bip32' {
  export function BIP32Factory(ecc: unknown): {
    fromSeed(seed: Uint8Array): {
      derivePath(path: string): { publicKey?: Uint8Array };
    };
  };
}

declare module 'bitcoinjs-lib' {
  export const payments: {
    p2wpkh(input: { pubkey: Uint8Array }): { address?: string };
  };
}

declare module 'tiny-secp256k1';

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

declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}
