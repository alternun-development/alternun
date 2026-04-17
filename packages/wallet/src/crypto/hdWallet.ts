import { deriveBitcoinAccount } from './bitcoinDerive';
import { deriveEvmAccount } from './evmDerive';
import { deriveSolanaAccount } from './solanaDerive';

export type DerivedWalletBundle = {
  accountIndex: number;
  evm: ReturnType<typeof deriveEvmAccount>;
  bitcoin: ReturnType<typeof deriveBitcoinAccount>;
  solana: ReturnType<typeof deriveSolanaAccount>;
};

export function deriveWalletBundle(mnemonic: string, accountIndex = 0): DerivedWalletBundle {
  return {
    accountIndex,
    evm: deriveEvmAccount(mnemonic, accountIndex),
    bitcoin: deriveBitcoinAccount(mnemonic, accountIndex),
    solana: deriveSolanaAccount(mnemonic, accountIndex),
  };
}
