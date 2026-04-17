import { mnemonicToAccount } from 'viem/accounts';

export const DEFAULT_EVM_PATH = "m/44'/60'/0'/0/0";

export type EvmDerivedAccount = {
  address: `0x${string}`;
  path: string;
};

export function deriveEvmAccount(mnemonic: string, accountIndex = 0): EvmDerivedAccount {
  const path = `m/44'/60'/0'/0/${accountIndex}`;
  const account = mnemonicToAccount(mnemonic, { path });
  return {
    address: account.address,
    path,
  };
}
