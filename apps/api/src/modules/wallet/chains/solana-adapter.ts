import { isTestnetStage } from '../../../common/env/network-stage';
import type { ChainActivityEntry, ChainAdapter, SolanaNetworkParams } from './chain-adapter';

// Default: a free, keyless public RPC, picked by stage (see evm-adapter.ts for the same
// testnet/mainnet split rationale). Public RPCs are aggressively rate-limited — fine for v1 given
// the TTL cache in wallet.service.ts, revisit with a dedicated provider before any real traffic.
const DEFAULT_TESTNET_SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const DEFAULT_MAINNET_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const ACTIVITY_LIMIT = 10;

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

async function jsonRpcCall<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
  fetchFn: typeof fetch
): Promise<T> {
  const res = await fetchFn(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });

  if (!res.ok) {
    throw new Error(`Solana RPC ${method} failed [${res.status}]`);
  }

  const body = (await res.json()) as JsonRpcResponse<T>;
  if (body.error) {
    throw new Error(`Solana RPC ${method} error: ${body.error.message}`);
  }
  if (body.result === undefined) {
    throw new Error(`Solana RPC ${method} returned no result`);
  }
  return body.result;
}

interface SolanaSignatureInfo {
  signature: string;
  err: unknown;
  blockTime: number | null;
}

interface SolanaTransactionDetail {
  transaction: { message: { accountKeys: string[] } };
  meta: { preBalances: number[]; postBalances: number[] } | null;
}

export class SolanaChainAdapter implements ChainAdapter {
  readonly chain = 'solana' as const;

  constructor(
    private readonly rpcUrl: string = process.env.WALLET_SOLANA_RPC_URL ??
      (isTestnetStage() ? DEFAULT_TESTNET_SOLANA_RPC_URL : DEFAULT_MAINNET_SOLANA_RPC_URL),
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  async getBalance(address: string): Promise<{ amount: string; unit: string }> {
    const result = await jsonRpcCall<{ value: number }>(
      this.rpcUrl,
      'getBalance',
      [address],
      this.fetchFn
    );
    return { amount: String(result.value), unit: 'lamport' };
  }

  async getActivity(address: string): Promise<ChainActivityEntry[]> {
    const signatures = await jsonRpcCall<SolanaSignatureInfo[]>(
      this.rpcUrl,
      'getSignaturesForAddress',
      [address, { limit: ACTIVITY_LIMIT }],
      this.fetchFn
    );

    const entries = await Promise.all(
      signatures.map(async (sig): Promise<ChainActivityEntry> => {
        try {
          const tx = await jsonRpcCall<SolanaTransactionDetail | null>(
            this.rpcUrl,
            'getTransaction',
            [sig.signature, { maxSupportedTransactionVersion: 0 }],
            this.fetchFn
          );

          const accountIndex = tx?.transaction.message.accountKeys.indexOf(address) ?? -1;
          const delta =
            tx?.meta && accountIndex >= 0
              ? tx.meta.postBalances[accountIndex] - tx.meta.preBalances[accountIndex]
              : 0;

          return {
            hash: sig.signature,
            direction: delta > 0 ? 'in' : delta < 0 ? 'out' : 'self',
            amount: String(Math.abs(delta)),
            counterparty: null, // best-effort: full counterparty resolution needs instruction parsing
            timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
            confirmed: !sig.err,
          };
        } catch {
          // A single failed lookup shouldn't fail the whole activity list.
          return {
            hash: sig.signature,
            direction: 'self',
            amount: '0',
            counterparty: null,
            timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
            confirmed: !sig.err,
          };
        }
      })
    );

    return entries;
  }

  async getNetworkParams(_address: string): Promise<SolanaNetworkParams> {
    const result = await jsonRpcCall<{ value: { blockhash: string } }>(
      this.rpcUrl,
      'getLatestBlockhash',
      [],
      this.fetchFn
    );
    return { chain: 'solana', recentBlockhash: result.value.blockhash };
  }

  async broadcast(signedTransaction: string): Promise<{ txHash: string }> {
    const signature = await jsonRpcCall<string>(
      this.rpcUrl,
      'sendTransaction',
      [signedTransaction, { encoding: 'base64' }],
      this.fetchFn
    );
    return { txHash: signature };
  }
}
