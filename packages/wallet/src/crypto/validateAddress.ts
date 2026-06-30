import { isAddress as isEvmAddress } from 'viem';
import {
  Address as BtcAddress,
  NETWORK as BTC_NETWORK,
  TEST_NETWORK as BTC_TEST_NETWORK,
} from '@scure/btc-signer';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';

export type SupportedChain = 'evm' | 'bitcoin' | 'solana';

// Per-chain recipient address format/checksum validation — sending to a wrong-chain-format
// address is a common, fund-losing mistake, so this is checked client-side before signing
// rather than left to fail at broadcast time.
export function isValidChainAddress(
  address: string,
  chain: SupportedChain,
  network: 'mainnet' | 'testnet'
): boolean {
  const trimmed = address.trim();
  if (!trimmed) return false;

  if (chain === 'evm') {
    return isEvmAddress(trimmed);
  }

  if (chain === 'bitcoin') {
    try {
      BtcAddress(network === 'mainnet' ? BTC_NETWORK : BTC_TEST_NETWORK).decode(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  // solana
  try {
    new SolanaPublicKey(trimmed);
    return true;
  } catch {
    return false;
  }
}
