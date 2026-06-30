import { isTestnetStage } from '../../../common/env/network-stage';
import type { ChainActivityEntry, ChainAdapter, EvmNetworkParams } from './chain-adapter';

// Default: free, keyless public RPCs, picked by stage (testnet.airs.alternun.co -> Sepolia,
// airs.alternun.co -> Ethereum mainnet). Override via WALLET_EVM_RPC_URL/WALLET_EVM_CHAIN_ID for a
// paid provider (Alchemy/Infura) once one is provisioned — same interface, no code changes needed.
const DEFAULT_TESTNET_EVM_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const DEFAULT_TESTNET_EVM_CHAIN_ID = 11155111; // Sepolia
const DEFAULT_MAINNET_EVM_RPC_URL = 'https://ethereum-rpc.publicnode.com';
const DEFAULT_MAINNET_EVM_CHAIN_ID = 1;

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
    throw new Error(`EVM RPC ${method} failed [${res.status}]`);
  }

  const body = (await res.json()) as JsonRpcResponse<T>;
  if (body.error) {
    throw new Error(`EVM RPC ${method} error: ${body.error.message}`);
  }
  if (body.result === undefined) {
    throw new Error(`EVM RPC ${method} returned no result`);
  }
  return body.result;
}

export class EvmChainAdapter implements ChainAdapter {
  readonly chain = 'evm' as const;

  constructor(
    private readonly rpcUrl: string = process.env.WALLET_EVM_RPC_URL ??
      (isTestnetStage() ? DEFAULT_TESTNET_EVM_RPC_URL : DEFAULT_MAINNET_EVM_RPC_URL),
    private readonly fetchFn: typeof fetch = fetch,
    private readonly chainId: number = process.env.WALLET_EVM_CHAIN_ID
      ? Number(process.env.WALLET_EVM_CHAIN_ID)
      : isTestnetStage()
      ? DEFAULT_TESTNET_EVM_CHAIN_ID
      : DEFAULT_MAINNET_EVM_CHAIN_ID
  ) {}

  async getBalance(address: string): Promise<{ amount: string; unit: string }> {
    const hexBalance = await jsonRpcCall<string>(
      this.rpcUrl,
      'eth_getBalance',
      [address, 'latest'],
      this.fetchFn
    );
    return { amount: BigInt(hexBalance).toString(), unit: 'wei' };
  }

  // NOTE (honest limitation, not silently wrong): raw JSON-RPC has no "list all transactions for
  // an address" method — that requires an indexing service (Etherscan/Alchemy/a self-hosted
  // indexer), which needs its own API key/account that nobody has provisioned yet. Returning an
  // empty list here is correct-but-incomplete, not a bug — task 07's follow-up is to wire a real
  // indexer once one is chosen. Do not implement this by scanning blocks; that does not scale.
  getActivity(_address: string): Promise<ChainActivityEntry[]> {
    return Promise.resolve([]);
  }

  async getNetworkParams(address: string): Promise<EvmNetworkParams> {
    const [nonceHex, gasPriceHex] = await Promise.all([
      jsonRpcCall<string>(
        this.rpcUrl,
        'eth_getTransactionCount',
        [address, 'pending'],
        this.fetchFn
      ),
      jsonRpcCall<string>(this.rpcUrl, 'eth_gasPrice', [], this.fetchFn),
    ]);

    return {
      chain: 'evm',
      nonce: Number(BigInt(nonceHex)),
      gasPriceWei: BigInt(gasPriceHex).toString(),
      chainId: this.chainId,
    };
  }

  async broadcast(signedTransaction: string): Promise<{ txHash: string }> {
    const txHash = await jsonRpcCall<string>(
      this.rpcUrl,
      'eth_sendRawTransaction',
      [signedTransaction],
      this.fetchFn
    );
    return { txHash };
  }
}
