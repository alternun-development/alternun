import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

// Thin client for the apps/api wallet module (00-SPEC.md §5). Never sends a mnemonic, private key,
// or PIN-derived encryption key — only a PIN digest (salt+hash) and public addresses cross the wire.

export interface AuthClient {
  getSessionToken(): Promise<string | null>;
}

export interface WalletAccountPayload {
  derivationIndex: number;
  evmAddress: string;
  bitcoinAddress: string;
  solanaAddress: string;
  isPrimary?: boolean;
}

export interface WalletAccountRecord extends WalletAccountPayload {
  id: string;
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
  const res = await fetch(`${resolveMobileApiBaseUrl()}/v1/wallet${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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

export async function verifyWalletPin(
  client: AuthClient,
  pin: string
): Promise<WalletVerifyPinResult> {
  return request(client, '/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) });
}
