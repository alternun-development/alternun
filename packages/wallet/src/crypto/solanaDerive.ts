import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { mnemonicToSeed } from './mnemonic';

export type SolanaDerivedAccount = {
  address: string;
  path: string;
  secretKeyBase58: string;
};

export function deriveSolanaAccount(mnemonic: string, accountIndex = 0): SolanaDerivedAccount {
  const path = `m/44'/501'/${accountIndex}'/0'`;
  const seed = Buffer.from(mnemonicToSeed(mnemonic));
  const { key } = derivePath(path, seed.toString('hex'));
  const keypair = Keypair.fromSeed(key);

  return {
    address: keypair.publicKey.toBase58(),
    path,
    secretKeyBase58: bs58.encode(keypair.secretKey),
  };
}
