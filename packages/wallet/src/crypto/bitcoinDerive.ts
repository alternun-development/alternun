import { BIP32Factory } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { mnemonicToSeed } from './mnemonic';

const bip32 = BIP32Factory(ecc);

export type BitcoinDerivedAccount = {
  address: string;
  path: string;
};

export function deriveBitcoinAccount(mnemonic: string, accountIndex = 0): BitcoinDerivedAccount {
  const seed = Buffer.from(mnemonicToSeed(mnemonic));
  const path = `m/44'/0'/0'/0/${accountIndex}`;
  const node = bip32.fromSeed(seed).derivePath(path);

  if (!node.publicKey) {
    throw new Error('Unable to derive Bitcoin public key.');
  }

  const payment = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(node.publicKey) });
  if (!payment.address) {
    throw new Error('Unable to derive Bitcoin native SegWit address.');
  }

  return {
    address: payment.address,
    path,
  };
}
