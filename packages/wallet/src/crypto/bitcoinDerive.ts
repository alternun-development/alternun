import { HDKey } from '@scure/bip32';
import { NETWORK, p2wpkh, TEST_NETWORK } from '@scure/btc-signer';
import { mnemonicToSeed } from './mnemonic';

// @scure/bip32 + @scure/btc-signer replace bip32 + bitcoinjs-lib. The originals required
// a global Buffer (a Node.js built-in), which doesn't exist in Hermes or browser environments
// without an explicit polyfill. The @scure/* family is pure TypeScript with zero Node.js globals.

export type BitcoinDerivedAccount = {
  address: string;
  path: string;
};

// Defaults to testnet: this app is dev/testnet-branded (see evm-adapter.ts's
// DEFAULT_TESTNET_EVM_RPC_URL for the same rationale), and the server-side balance/activity/
// broadcast adapters select testnet vs mainnet Esplora per deploy stage
// (apps/api/src/common/env/network-stage.ts). A mismatched network prefix here (bc1... derived
// while the server queries testnet Esplora, or vice versa) makes every balance/activity/broadcast
// call fail silently — this was a real bug: every wallet derived a mainnet bc1... address
// regardless of stage, so balance lookups against testnet Esplora 400'd and were dropped from the
// response. Callers MUST pass the correct network explicitly to match their deploy stage —
// see WalletCreationFlow.tsx/WalletRestoreFlow.tsx's isTestnetRuntime() usage.
export function deriveBitcoinAccount(
  mnemonic: string,
  accountIndex = 0,
  network: 'mainnet' | 'testnet' = 'testnet'
): BitcoinDerivedAccount {
  const seed = mnemonicToSeed(mnemonic);
  // NOTE: this path uses BIP-44's purpose (44') even though the output below is a native
  // segwit (p2wpkh, bc1.../tb1...) address, which BIP-84 conventionally labels with purpose 84'.
  // This is a deliberate, documented deviation (see .agents/active-tasks/alternun-wallet-system/
  // 00-SPEC.md §3.3) — the address is still valid, it just won't auto-detect as segwit in
  // external wallets that infer script type from the purpose field. Do NOT change this to 84'
  // without a migration plan: doing so would derive different addresses for every existing
  // wallet, silently orphaning any funds sent to the old (44') addresses.
  const path = `m/44'/0'/0'/0/${accountIndex}`;
  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive(path);

  if (!child.publicKey) {
    throw new Error('Unable to derive Bitcoin public key.');
  }

  const payment = p2wpkh(child.publicKey, network === 'mainnet' ? NETWORK : TEST_NETWORK);
  if (!payment.address) {
    throw new Error('Unable to derive Bitcoin native SegWit address.');
  }

  return {
    address: payment.address,
    path,
  };
}
