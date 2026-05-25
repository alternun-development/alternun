import { savePendingReferralData } from '../referralPersistence';
import type { PendingReferralData } from '../referralStorage';

const { afterEach, beforeEach, describe, expect, it } = globalThis as unknown as {
  afterEach: (fn: () => void) => void;
  beforeEach: (fn: () => void) => void;
  describe: (name: string, fn: () => void) => void;
  expect: (actual: unknown) => {
    toBe: (expected: unknown) => void;
    toContain: (expected: unknown) => void;
  };
  it: (name: string, fn: () => void | Promise<void>) => void;
};

type FetchCall = {
  input: string | URL | Request;
  init?: RequestInit;
};

const referralData: PendingReferralData = {
  referred_by_username: null,
  referred_by_email: null,
  referral_code: 'edward-5d64df',
  invitation_code: 'edward-5d64df',
};

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('referralPersistence', () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  let calls: FetchCall[];

  beforeEach(() => {
    calls = [];
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  it('accepts a 400 referral POST when the user summary already has attribution', async () => {
    globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init });
      if (calls.length === 1) {
        return Promise.resolve(response(400, { message: 'Invalid referral code' }));
      }

      return Promise.resolve(
        response(200, {
          referred_by_user_id: '79659560-6cbb-43d6-81a5-41a0dc1c21ac',
          referred_by_referral_code: 'edward-539f1d',
        })
      );
    };

    await savePendingReferralData('user-1', referralData);

    expect(calls.length).toBe(2);
    expect(String(calls[0]?.input)).toBe('https://api.example.test/v1/referrals');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(String(calls[1]?.input)).toContain(
      'https://api.example.test/v1/referrals/me?user_id=user-1'
    );
    expect(calls[1]?.init?.method).toBe('GET');
  });

  it('does not retry client validation failures without confirmed attribution', async () => {
    globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init });
      if (calls.length === 1) {
        return Promise.resolve(response(400, { message: 'Invalid referral code' }));
      }

      return Promise.resolve(
        response(200, {
          referred_by_user_id: null,
          referred_by_referral_code: null,
        })
      );
    };

    let threw = false;
    try {
      await savePendingReferralData('user-1', referralData);
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
    expect(calls.length).toBe(2);
  });
});
