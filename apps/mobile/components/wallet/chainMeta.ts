import { isValidChainAddress as packageIsValidChainAddress } from '@alternun/wallet';
import type { WalletChain } from './walletApiClient';

export const CHAIN_META: Record<
  WalletChain,
  {
    label: string;
    dotColor: string;
    unit: string;
    decimals: number;
    testnetLabel: string;
    mainnetLabel: string;
  }
> = {
  evm: {
    label: 'Ethereum / EVM',
    dotColor: '#627EEA',
    unit: 'ETH',
    decimals: 18,
    testnetLabel: 'Sepolia',
    mainnetLabel: 'Ethereum',
  },
  bitcoin: {
    label: 'Bitcoin',
    dotColor: '#F7931A',
    unit: 'BTC',
    decimals: 8,
    testnetLabel: 'BTC Testnet',
    mainnetLabel: 'Bitcoin',
  },
  solana: {
    label: 'Solana',
    dotColor: '#9945FF',
    unit: 'SOL',
    decimals: 9,
    testnetLabel: 'Devnet',
    mainnetLabel: 'Mainnet Beta',
  },
};

export function getChainNetworkLabel(chain: WalletChain, isTestnet: boolean): string {
  return isTestnet ? CHAIN_META[chain].testnetLabel : CHAIN_META[chain].mainnetLabel;
}

export const CHAIN_ORDER: WalletChain[] = ['evm', 'bitcoin', 'solana'];

export function formatChainAmount(smallestUnitAmount: string, chain: WalletChain): string {
  const decimals = CHAIN_META[chain].decimals;
  let value: number;
  try {
    value = Number(BigInt(smallestUnitAmount)) / 10 ** decimals;
  } catch {
    return '0';
  }
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function parseChainAmountToSmallestUnit(input: string, chain: WalletChain): bigint {
  const decimals = CHAIN_META[chain].decimals;
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Invalid amount.');
  }
  const [whole, fraction = ''] = trimmed.split('.');
  const paddedFraction = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || '0');
}

// Per-chain recipient address format/checksum validation (00-SPEC.md task 06 acceptance
// criteria — sending to a wrong-chain-format address is a common, fund-losing mistake, so this
// is checked before allowing "Continue" in the Send flow, not left to fail at broadcast time.
// Implementation lives in @alternun/wallet (same package as the signing functions) so apps/mobile
// doesn't need viem/@scure/@solana as direct dependencies.
export function isValidChainAddress(
  address: string,
  chain: WalletChain,
  network: 'mainnet' | 'testnet'
): boolean {
  return packageIsValidChainAddress(address, chain, network);
}

export function addressForChain(
  account: { evmAddress: string; bitcoinAddress: string; solanaAddress: string },
  chain: WalletChain
): string {
  if (chain === 'evm') return account.evmAddress;
  if (chain === 'bitcoin') return account.bitcoinAddress;
  return account.solanaAddress;
}
