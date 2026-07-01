/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  WalletApiError,
  listWalletAccounts,
  setupWallet,
  verifyWalletPin,
  deleteWalletAccount,
  generateExternalChallenge,
  verifyAndLinkExternalWallet,
  setPrimaryWalletAccount,
} from '../walletApiClient';

jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: () => 'https://testnet.api.alternun.co',
}));

const mockToken = 'test-token-abc';
const mockClient = { getSessionToken: jest.fn(async () => mockToken) };

function mockFetch(status: number, body: unknown): void {
  (global as any).fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

function lastFetchCall(): { url: string; options: RequestInit } {
  const calls = ((global as any).fetch as jest.Mock).mock.calls;
  const [url, options] = calls[calls.length - 1] as [string, RequestInit];
  return { url, options };
}

describe('WalletApiError', () => {
  it('sets name, message, and status', () => {
    const err = new WalletApiError('oops', 403);
    expect(err.name).toBe('WalletApiError');
    expect(err.message).toBe('oops');
    expect(err.status).toBe(403);
    expect(err instanceof Error).toBe(true);
  });
});

describe('request internals via exported functions', () => {
  beforeEach(() => {
    mockClient.getSessionToken.mockResolvedValue(mockToken);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('sends Authorization header on GET request', async () => {
    mockFetch(200, { accounts: [] });
    await listWalletAccounts(mockClient);
    const { options } = lastFetchCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${mockToken}`);
  });

  it('does NOT send Content-Type on a GET request (no body)', async () => {
    mockFetch(200, { accounts: [] });
    await listWalletAccounts(mockClient);
    const { options } = lastFetchCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('sends Content-Type: application/json on POST with a body', async () => {
    mockFetch(200, { verified: true });
    await verifyWalletPin(mockClient, '1234');
    const { options } = lastFetchCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('hits the correct endpoint for listWalletAccounts', async () => {
    mockFetch(200, { accounts: [] });
    await listWalletAccounts(mockClient);
    const { url, options } = lastFetchCall();
    expect(url).toBe('https://testnet.api.alternun.co/v1/wallet/accounts');
    expect(options.method).toBe('GET');
  });

  it('throws WalletApiError with server message on non-ok response', async () => {
    mockFetch(409, { message: 'Wallet already exists' });
    await expect(
      setupWallet(mockClient, {
        pinSalt: 's',
        pinHash: 'h',
        account: {
          derivationIndex: 0,
          evmAddress: '0x1',
          bitcoinAddress: 'tb1q',
          solanaAddress: 'sol1',
        },
      })
    ).rejects.toMatchObject({ status: 409, message: 'Wallet already exists' });
  });

  it('throws WalletApiError with fallback message when body has no message field', async () => {
    mockFetch(500, null);
    await expect(listWalletAccounts(mockClient)).rejects.toMatchObject({
      status: 500,
      message: 'Wallet request failed (500)',
    });
  });

  it('throws WalletApiError(401) when session token is missing', async () => {
    mockClient.getSessionToken.mockResolvedValue(null as any);
    await expect(listWalletAccounts(mockClient)).rejects.toMatchObject({ status: 401 });
  });

  it('deleteWalletAccount encodes the account id in the URL', async () => {
    mockFetch(200, { accounts: [] });
    await deleteWalletAccount(mockClient, 'acc/123');
    const { url, options } = lastFetchCall();
    expect(url).toContain('/accounts/acc%2F123');
    expect(options.method).toBe('DELETE');
  });

  it('generateExternalChallenge POSTs with no body', async () => {
    mockFetch(200, { challenge: 'ch', nonce: 'n' });
    await generateExternalChallenge(mockClient);
    const { url, options } = lastFetchCall();
    expect(url).toContain('/accounts/external/challenge');
    expect(options.method).toBe('POST');
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('verifyAndLinkExternalWallet POSTs address/nonce/signature', async () => {
    const account = {
      id: 'a1',
      walletType: 'external' as const,
      derivationIndex: 0,
      evmAddress: '0x1',
      bitcoinAddress: '',
      solanaAddress: '',
      isPrimary: false,
      label: null,
    };
    mockFetch(200, { account });
    await verifyAndLinkExternalWallet(mockClient, '0x1', 'nonce', '0xsig');
    const { url, options } = lastFetchCall();
    expect(url).toContain('/accounts/external/verify');
    expect(JSON.parse(options.body as string)).toMatchObject({
      address: '0x1',
      nonce: 'nonce',
      signature: '0xsig',
    });
  });

  it('setPrimaryWalletAccount PATCHes the correct endpoint', async () => {
    mockFetch(200, { accounts: [] });
    await setPrimaryWalletAccount(mockClient, 'acc-99');
    const { url, options } = lastFetchCall();
    expect(url).toContain('/accounts/acc-99/primary');
    expect(options.method).toBe('PATCH');
  });
});
