import { mnemonicToAccount } from 'viem/accounts';
import { HDKey } from '@scure/bip32';
import { NETWORK, p2wpkh, TEST_NETWORK, Transaction as BtcTransaction } from '@scure/btc-signer';
import { Keypair, PublicKey, SystemProgram, Transaction as SolTransaction } from '@solana/web3.js';
import { bytesToHex } from '@noble/hashes/utils';
import { derivePath } from './slip10Ed25519';
import { mnemonicToSeed } from './mnemonic';

// Native-currency-only sends (ETH/BTC/SOL transfers, no tokens/SPL) — matches the v1 Send screen
// scope (00-SPEC.md §6). The server never sees the mnemonic/private key: these functions derive
// the signing key in-memory from the already-decrypted mnemonic and return a serialized,
// ready-to-broadcast transaction.

export type EvmSignParams = {
  to: `0x${string}`;
  valueWei: bigint;
  nonce: number;
  gasPriceWei: bigint;
  chainId: number;
  gasLimit?: bigint;
};

export async function signEvmTransaction(
  mnemonic: string,
  accountIndex: number,
  params: EvmSignParams
): Promise<string> {
  const path = `m/44'/60'/0'/0/${accountIndex}` as const;
  const account = mnemonicToAccount(mnemonic, { path });
  return account.signTransaction({
    to: params.to,
    value: params.valueWei,
    nonce: params.nonce,
    gasPrice: params.gasPriceWei,
    chainId: params.chainId,
    gas: params.gasLimit ?? 21000n,
  });
}

export type BitcoinUtxoInput = {
  txid: string;
  vout: number;
  valueSats: number;
};

export type BitcoinSignParams = {
  utxos: BitcoinUtxoInput[];
  toAddress: string;
  changeAddress: string;
  amountSats: bigint;
  feeRateSatsPerVb: number;
  network?: 'mainnet' | 'testnet';
};

// Rough P2WPKH virtual-size estimate (input ~68vB, output ~31vB, ~11vB overhead) — fine for fee
// estimation on a same-script-type wallet; a dedicated coin-selection/fee module is out of v1 scope.
function estimateVsize(inputCount: number, outputCount: number): number {
  return 11 + inputCount * 68 + outputCount * 31;
}

export function signBitcoinTransaction(
  mnemonic: string,
  accountIndex: number,
  params: BitcoinSignParams
): string {
  const seed = mnemonicToSeed(mnemonic);
  const path = `m/44'/0'/0'/0/${accountIndex}`;
  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error('Unable to derive Bitcoin signing key.');
  }

  const network = params.network === 'mainnet' ? NETWORK : TEST_NETWORK;
  const ownScript = p2wpkh(child.publicKey, network).script;

  const tx = new BtcTransaction();
  let totalInSats = 0n;
  for (const utxo of params.utxos) {
    tx.addInput({
      txid: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: ownScript, amount: BigInt(utxo.valueSats) },
    });
    totalInSats += BigInt(utxo.valueSats);
  }

  tx.addOutputAddress(params.toAddress, params.amountSats, network);

  const fee = BigInt(Math.ceil(estimateVsize(params.utxos.length, 2) * params.feeRateSatsPerVb));
  const change = totalInSats - params.amountSats - fee;
  if (change < 0n) {
    throw new Error('Insufficient UTXO balance to cover the amount and estimated fee.');
  }
  if (change > 0n) {
    tx.addOutputAddress(params.changeAddress, change, network);
  }

  tx.sign(child.privateKey);
  tx.finalize();
  return bytesToHex(tx.extract());
}

export type SolanaSignParams = {
  toAddress: string;
  lamports: number;
  recentBlockhash: string;
};

export function signSolanaTransaction(
  mnemonic: string,
  accountIndex: number,
  params: SolanaSignParams
): string {
  const path = `m/44'/501'/${accountIndex}'/0'`;
  const seed = mnemonicToSeed(mnemonic);
  const { key } = derivePath(path, seed);
  const keypair = Keypair.fromSeed(key);

  const tx = new SolTransaction({
    recentBlockhash: params.recentBlockhash,
    feePayer: keypair.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(params.toAddress),
      lamports: params.lamports,
    })
  );

  tx.sign(keypair);
  return tx.serialize().toString('base64');
}
