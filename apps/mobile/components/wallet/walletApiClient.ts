import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

// Thin client for the apps/api wallet module (00-SPEC.md §5). Never sends a mnemonic, private key,
// or PIN-derived encryption key — only a PIN digest (salt+hash) and public addresses cross the wire.

export interface AuthClient {
  getSessionToken(): Promise<string | null>;
}

export type WalletAccountType = 'airs_hd' | 'external';

export interface WalletAccountPayload {
  derivationIndex: number;
  evmAddress: string;
  bitcoinAddress: string;
  solanaAddress: string;
  isPrimary?: boolean;
  walletType?: WalletAccountType;
  label?: string;
}

export interface WalletAccountRecord extends Omit<WalletAccountPayload, 'walletType' | 'label'> {
  id: string;
  walletType: WalletAccountType;
  label: string | null;
}

export interface WalletVerifyPinResult {
  verified: boolean;
  lockedUntil?: string;
  remainingAttempts?: number;
  sessionKey?: string;
  sessionExpiresAt?: string;
}

export class WalletApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'WalletApiError';
  }
}

async function requireToken(client: AuthClient): Promise<string> {
  const token = await client.getSessionToken();
  if (!token) {
    throw new WalletApiError('No session token available', 401);
  }
  return token;
}

async function request<T>(client: AuthClient, path: string, init?: RequestInit): Promise<T> {
  const token = await requireToken(client);
  // Only set Content-Type when there's a body — Fastify rejects POST requests with
  // Content-Type: application/json but no body ("Body cannot be empty...").
  const hasBody = init?.body !== undefined;
  const res = await fetch(`${resolveMobileApiBaseUrl()}/v1/wallet${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as T | { message?: string } | null;

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : `Wallet request failed (${res.status})`;
    throw new WalletApiError(message, res.status);
  }

  return body as T;
}

export async function setupWallet(
  client: AuthClient,
  input: { pinSalt: string; pinHash: string; account: WalletAccountPayload }
): Promise<{ account: WalletAccountRecord }> {
  return request(client, '/setup', { method: 'POST', body: JSON.stringify(input) });
}

export async function addWalletAccount(
  client: AuthClient,
  account: WalletAccountPayload
): Promise<{ account: WalletAccountRecord }> {
  return request(client, '/accounts', { method: 'POST', body: JSON.stringify({ account }) });
}

export async function listWalletAccounts(
  client: AuthClient
): Promise<{ accounts: WalletAccountRecord[] }> {
  return request(client, '/accounts', { method: 'GET' });
}

// Device-change recovery: re-derives the same addresses from an already-backed-up mnemonic on a
// new device and registers a new PIN — overwrites the existing PIN digest/primary account rather
// than rejecting (unlike setupWallet, which is first-time-only).
export async function restoreWallet(
  client: AuthClient,
  input: { pinSalt: string; pinHash: string; account: WalletAccountPayload }
): Promise<{ account: WalletAccountRecord }> {
  return request(client, '/restore', { method: 'POST', body: JSON.stringify(input) });
}

export async function setPrimaryWalletAccount(
  client: AuthClient,
  accountId: string
): Promise<{ accounts: WalletAccountRecord[] }> {
  return request(client, `/accounts/${encodeURIComponent(accountId)}/primary`, {
    method: 'PATCH',
  });
}

export async function verifyWalletPin(
  client: AuthClient,
  pin: string
): Promise<WalletVerifyPinResult> {
  return request(client, '/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) });
}

export type WalletChain = 'evm' | 'bitcoin' | 'solana';

export interface WalletBalance {
  chain: WalletChain;
  amount: string;
  unit: string;
}

export interface WalletActivityEntry {
  chain: WalletChain;
  hash: string;
  direction: 'in' | 'out' | 'self';
  amount: string;
  counterparty: string | null;
  timestamp: string | null;
  confirmed: boolean;
}

export async function getWalletBalances(
  client: AuthClient
): Promise<{ balances: WalletBalance[] }> {
  return request(client, '/balances', { method: 'GET' });
}

export async function getWalletActivity(
  client: AuthClient
): Promise<{ activity: WalletActivityEntry[] }> {
  return request(client, '/activity', { method: 'GET' });
}

export type EvmNetworkParams = {
  chain: 'evm';
  nonce: number;
  gasPriceWei: string;
  chainId: number;
};
export type BitcoinNetworkParams = {
  chain: 'bitcoin';
  utxos: Array<{ txid: string; vout: number; valueSats: number; confirmed: boolean }>;
  feeRateSatsPerVb: number;
};
export type SolanaNetworkParams = { chain: 'solana'; recentBlockhash: string };
export type WalletNetworkParams = EvmNetworkParams | BitcoinNetworkParams | SolanaNetworkParams;

export async function getWalletNetworkParams(
  client: AuthClient,
  chain: WalletChain
): Promise<WalletNetworkParams> {
  return request(client, `/network-params?chain=${chain}`, { method: 'GET' });
}

export async function broadcastWalletTransaction(
  client: AuthClient,
  chain: WalletChain,
  signedTransaction: string
): Promise<{ txHash: string }> {
  return request(client, '/broadcast', {
    method: 'POST',
    body: JSON.stringify({ chain, signedTransaction }),
  });
}

export async function deleteWalletAccount(
  client: AuthClient,
  accountId: string
): Promise<{ accounts: WalletAccountRecord[] }> {
  return request(client, `/accounts/${encodeURIComponent(accountId)}`, { method: 'DELETE' });
}

export async function generateExternalChallenge(
  client: AuthClient
): Promise<{ challenge: string; nonce: string }> {
  return request(client, '/accounts/external/challenge', { method: 'POST' });
}

export async function verifyAndLinkExternalWallet(
  client: AuthClient,
  address: string,
  nonce: string,
  signature: string,
  label?: string
): Promise<{ account: WalletAccountRecord }> {
  return request(client, '/accounts/external/verify', {
    method: 'POST',
    body: JSON.stringify({ address, nonce, signature, label }),
  });
}
