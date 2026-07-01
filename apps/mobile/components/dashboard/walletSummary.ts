export interface WalletSummaryAccount {
  evmAddress?: string | null;
  bitcoinAddress?: string | null;
  solanaAddress?: string | null;
}

export interface WalletSummaryState {
  mode: 'setup' | 'ready';
  address: string | null;
}

function firstNonEmptyString(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
}

export function resolveWalletSummaryState(
  account: WalletSummaryAccount | null
): WalletSummaryState {
  const address = firstNonEmptyString([
    account?.evmAddress,
    account?.bitcoinAddress,
    account?.solanaAddress,
  ]);

  return {
    mode: address ? 'ready' : 'setup',
    address,
  };
}
