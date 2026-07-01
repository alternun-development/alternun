// Per-chain adapter interface (00-SPEC.md §5 / task 07). Swappable: a paid provider (Alchemy,
// Infura, a dedicated Solana RPC, a Bitcoin node) can replace the default public-RPC
// implementations below by implementing the same interface — no controller/service changes.

export interface ChainActivityEntry {
  hash: string;
  direction: 'in' | 'out' | 'self';
  amount: string; // smallest unit (wei / lamports / satoshis), as a decimal string
  counterparty: string | null;
  timestamp: string | null; // ISO 8601, null if pending/unknown
  confirmed: boolean;
}

// Chain-specific parameters needed to build an unsigned transaction client-side. The server
// supplies only public network state (nonces, fee estimates, UTXOs, recent blockhash) — never
// the recipient/amount, which the client includes when it builds and signs the transaction.
export type EvmNetworkParams = {
  chain: 'evm';
  nonce: number;
  gasPriceWei: string;
  chainId: number;
};

export type BitcoinUtxo = {
  txid: string;
  vout: number;
  valueSats: number;
  confirmed: boolean;
};

export type BitcoinNetworkParams = {
  chain: 'bitcoin';
  utxos: BitcoinUtxo[];
  feeRateSatsPerVb: number;
};

export type SolanaNetworkParams = {
  chain: 'solana';
  recentBlockhash: string;
};

export type NetworkParams = EvmNetworkParams | BitcoinNetworkParams | SolanaNetworkParams;

export interface ChainAdapter {
  readonly chain: 'evm' | 'bitcoin' | 'solana';
  getBalance(address: string): Promise<{ amount: string; unit: string }>;
  getActivity(address: string): Promise<ChainActivityEntry[]>;
  getNetworkParams(address: string): Promise<NetworkParams>;
  broadcast(signedTransaction: string): Promise<{ txHash: string }>;
}
