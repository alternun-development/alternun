import { isTestnetStage } from '../../../common/env/network-stage';
import type { BitcoinNetworkParams, ChainActivityEntry, ChainAdapter } from './chain-adapter';

// Default: Blockstream's free, keyless Esplora REST API, picked by stage (see evm-adapter.ts for
// the same testnet/mainnet split rationale). Override via env for a self-hosted Esplora/node.
const DEFAULT_TESTNET_BITCOIN_API_BASE = 'https://blockstream.info/testnet/api';
const DEFAULT_MAINNET_BITCOIN_API_BASE = 'https://blockstream.info/api';

interface EsploraAddressStats {
  chain_stats: { funded_txo_sum: number; spent_txo_sum: number };
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number };
}

interface EsploraTx {
  txid: string;
  status: { confirmed: boolean; block_time?: number };
  vin: Array<{ prevout?: { scriptpubkey_address?: string } }>;
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
}

export class BitcoinChainAdapter implements ChainAdapter {
  readonly chain = 'bitcoin' as const;

  constructor(
    private readonly apiBase: string = process.env.WALLET_BITCOIN_API_BASE ??
      (isTestnetStage() ? DEFAULT_TESTNET_BITCOIN_API_BASE : DEFAULT_MAINNET_BITCOIN_API_BASE),
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  async getBalance(address: string): Promise<{ amount: string; unit: string }> {
    const res = await this.fetchFn(`${this.apiBase}/address/${address}`);
    if (!res.ok) {
      throw new Error(`Bitcoin balance lookup failed [${res.status}]`);
    }
    const stats = (await res.json()) as EsploraAddressStats;
    const confirmed = stats.chain_stats.funded_txo_sum - stats.chain_stats.spent_txo_sum;
    const pending = stats.mempool_stats.funded_txo_sum - stats.mempool_stats.spent_txo_sum;
    return { amount: String(confirmed + pending), unit: 'satoshi' };
  }

  async getActivity(address: string): Promise<ChainActivityEntry[]> {
    const res = await this.fetchFn(`${this.apiBase}/address/${address}/txs`);
    if (!res.ok) {
      throw new Error(`Bitcoin activity lookup failed [${res.status}]`);
    }
    const txs = (await res.json()) as EsploraTx[];

    return txs.slice(0, 25).map((tx) => {
      const isSender = tx.vin.some((input) => input.prevout?.scriptpubkey_address === address);
      const ownOutput = tx.vout.find((output) => output.scriptpubkey_address === address);
      const otherOutput = tx.vout.find((output) => output.scriptpubkey_address !== address);

      return {
        hash: tx.txid,
        direction: isSender ? (ownOutput ? 'self' : 'out') : 'in',
        amount: String(ownOutput?.value ?? otherOutput?.value ?? 0),
        counterparty: isSender
          ? otherOutput?.scriptpubkey_address ?? null
          : tx.vin[0]?.prevout?.scriptpubkey_address ?? null,
        timestamp: tx.status.block_time
          ? new Date(tx.status.block_time * 1000).toISOString()
          : null,
        confirmed: tx.status.confirmed,
      };
    });
  }

  async getNetworkParams(address: string): Promise<BitcoinNetworkParams> {
    const [utxoRes, feeRes] = await Promise.all([
      this.fetchFn(`${this.apiBase}/address/${address}/utxo`),
      this.fetchFn(`${this.apiBase}/fee-estimates`),
    ]);

    if (!utxoRes.ok) {
      throw new Error(`Bitcoin UTXO lookup failed [${utxoRes.status}]`);
    }
    const rawUtxos = (await utxoRes.json()) as Array<{
      txid: string;
      vout: number;
      value: number;
      status: { confirmed: boolean };
    }>;

    // Esplora's fee-estimates is { "<confirmation target blocks>": satPerVb }; "6" is a
    // reasonable default (confirm within ~6 blocks) without exposing fee-bumping UX yet.
    let feeRateSatsPerVb = 1;
    if (feeRes.ok) {
      const estimates = (await feeRes.json()) as Record<string, number>;
      feeRateSatsPerVb = Math.ceil(estimates['6'] ?? estimates['1'] ?? 1);
    }

    return {
      chain: 'bitcoin',
      utxos: rawUtxos.map((u) => ({
        txid: u.txid,
        vout: u.vout,
        valueSats: u.value,
        confirmed: u.status.confirmed,
      })),
      feeRateSatsPerVb,
    };
  }

  async broadcast(signedTransaction: string): Promise<{ txHash: string }> {
    const res = await this.fetchFn(`${this.apiBase}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: signedTransaction,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Bitcoin broadcast failed [${res.status}]: ${text}`);
    }
    const txHash = await res.text();
    return { txHash: txHash.trim() };
  }
}
