/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */

import { jest } from '@jest/globals';
import { restoreBetterAuthSession } from '../betterAuthSessionRestore';
import { authentikPreset } from '../authWebSession';

jest.mock('@alternun/auth', () => ({
  createAlternunAuthentikPreset: (options: any) => ({
    onSessionReady: async (claims: any, provider?: string) => {
      const result = await options.provisioningAdapter.sync({
        sub: claims.sub,
        iss: claims.iss,
        email: claims.email,
        emailVerified: claims.email_verified,
        name: claims.name,
        picture: claims.picture,
        provider,
        rawClaims: claims,
      });
      if (!result.synced) {
        throw new Error(result.error ?? 'Provisioning failed');
      }
      return result.appUserId;
    },
  }),
  resolveAuthRuntimeConfig: () => ({
    authExchangeUrl: process.env.EXPO_PUBLIC_AUTH_EXCHANGE_URL,
  }),
  resolveAuthentikClientId: (value: string | undefined) => value ?? '',
  resolveAuthentikIssuer: (value: string | undefined) => value,
  resolveAuthentikRedirectUri: (value: string | undefined) => value,
}));

type TestFn = (name: string, fn: () => Promise<void> | void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
};

const { describe, expect, it } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('restoreBetterAuthSession', () => {
  it('retries until the Better Auth session token becomes available', async () => {
    let refreshCalls = 0;
    let tokenCalls = 0;

    const restored = await restoreBetterAuthSession(
      {
        refreshExecutionSession: () => {
          refreshCalls += 1;
          return Promise.resolve(undefined);
        },
        getSessionToken: () => {
          tokenCalls += 1;
          return Promise.resolve(tokenCalls === 1 ? null : 'session-token');
        },
      },
      {
        retries: 2,
        retryDelayMs: 0,
      }
    );

    expect(restored).toBe(true);
    expect(refreshCalls).toBe(2);
    expect(tokenCalls).toBe(2);
  });

  it('retries until the canonical Alternun session is available', async () => {
    let refreshCalls = 0;
    let alternunCalls = 0;

    const restored = await restoreBetterAuthSession(
      {
        refreshExecutionSession: () => {
          refreshCalls += 1;
          return Promise.resolve(undefined);
        },
        getAlternunSession: () => {
          alternunCalls += 1;
          return Promise.resolve(
            alternunCalls === 1
              ? null
              : {
                  issuerAccessToken: 'issuer-token',
                }
          );
        },
      },
      {
        retries: 2,
        retryDelayMs: 0,
      }
    );

    expect(restored).toBe(true);
    expect(refreshCalls).toBe(2);
    expect(alternunCalls).toBe(2);
  });

  it('returns false when the session never appears', async () => {
    let refreshCalls = 0;
    let alternunCalls = 0;

    const restored = await restoreBetterAuthSession(
      {
        refreshExecutionSession: () => {
          refreshCalls += 1;
          return Promise.resolve(undefined);
        },
        getAlternunSession: () => {
          alternunCalls += 1;
          return Promise.resolve(null);
        },
      },
      {
        retries: 2,
        retryDelayMs: 0,
      }
    );

    expect(restored).toBe(false);
    expect(refreshCalls).toBe(2);
    expect(alternunCalls).toBe(2);
  });
});

describe('Authentik callback provisioning', () => {
  const originalFetch = globalThis.fetch;
  const originalAuthExchangeUrl = process.env.EXPO_PUBLIC_AUTH_EXCHANGE_URL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalAuthExchangeUrl === undefined) {
      delete process.env.EXPO_PUBLIC_AUTH_EXCHANGE_URL;
    } else {
      process.env.EXPO_PUBLIC_AUTH_EXCHANGE_URL = originalAuthExchangeUrl;
    }
  });

  it('provisions through the backend exchange endpoint', async () => {
    process.env.EXPO_PUBLIC_AUTH_EXCHANGE_URL = 'https://api.example.com/auth/exchange';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ appUserId: 'app-user-42', syncStatus: 'synced' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const appUserId = await authentikPreset.onSessionReady(
      {
        sub: 'authentik-user-1',
        iss: 'https://sso.example.com/application/o/alternun-mobile/',
        email: 'ada@example.com',
        email_verified: true,
        name: 'Ada Lovelace',
      },
      'authentik'
    );

    expect(appUserId).toBe('app-user-42');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/auth/exchange',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('authentik-user-1'),
      })
    );
  });

  it('rejects callback completion when the backend does not sync the user', async () => {
    process.env.EXPO_PUBLIC_AUTH_EXCHANGE_URL = 'https://api.example.com/auth/exchange';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ appUserId: null, syncStatus: 'skipped' }),
    }) as unknown as typeof fetch;

    await expect(
      authentikPreset.onSessionReady(
        {
          sub: 'authentik-user-2',
          iss: 'https://sso.example.com/application/o/alternun-mobile/',
          email: 'grace@example.com',
        },
        'authentik'
      )
    ).rejects.toThrow('Auth backend did not confirm Authentik user provisioning.');
  });
});
