/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { restoreBetterAuthSession } from '../betterAuthSessionRestore';

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
