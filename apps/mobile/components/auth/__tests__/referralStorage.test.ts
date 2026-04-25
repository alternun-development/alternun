import {
  clearPendingReferralData,
  hasPendingReferralData,
  readPendingReferralCode,
  readPendingReferralData,
  writePendingReferralData,
} from '../referralStorage';

const { describe, expect, it, beforeEach } = globalThis as unknown as {
  describe: (name: string, fn: () => void) => void;
  expect: (actual: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
  };
  it: (name: string, fn: () => void) => void;
  beforeEach: (fn: () => void) => void;
};

function createSessionStorage(): Storage {
  const store = new Map<string, string>();

  return {
    length: 0,
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as Storage;
}

describe('referralStorage', () => {
  const sessionStorage = createSessionStorage();

  beforeEach(() => {
    sessionStorage.clear();
    (globalThis as typeof globalThis & { window?: { sessionStorage: Storage } }).window = {
      sessionStorage,
    };
  });

  it('reads and clears pending referral data', () => {
    writePendingReferralData({
      referred_by_username: 'edward',
      referred_by_email: 'edward@example.com',
      referral_code: 'edward-44ft34',
      invitation_code: 'edward-44ft34',
    });

    expect(hasPendingReferralData()).toBe(true);
    expect(readPendingReferralData()).toEqual({
      referred_by_username: 'edward',
      referred_by_email: 'edward@example.com',
      referral_code: 'edward-44ft34',
      invitation_code: 'edward-44ft34',
    });
    expect(readPendingReferralCode()).toBe('edward-44ft34');

    clearPendingReferralData();

    expect(hasPendingReferralData()).toBe(false);
    expect(readPendingReferralData()).toBe(null);
    expect(readPendingReferralCode()).toBe(null);
  });

  it('prefers referral_code and falls back to invitation_code', () => {
    window.sessionStorage.setItem(
      'pendingReferralData',
      JSON.stringify({
        referral_code: null,
        invitation_code: '  edward-44ft34  ',
      })
    );

    expect(readPendingReferralCode()).toBe('edward-44ft34');
  });
});
