import { resolveInitialAuthMode } from '../../components/auth/authRouteMode';

const { describe, expect, it } = globalThis as unknown as {
  describe: (name: string, fn: () => void) => void;
  expect: (actual: unknown) => { toBe: (expected: unknown) => void };
  it: (name: string, fn: () => void) => void;
};

describe('auth route mode resolution', () => {
  it('prefers signup when a referral code is present on first load', () => {
    expect(resolveInitialAuthMode(null, true)).toBe('signup');
    expect(resolveInitialAuthMode('signup', true)).toBe('signup');
  });

  it('still honors an explicit signin mode', () => {
    expect(resolveInitialAuthMode('signin', true)).toBe('signin');
    expect(resolveInitialAuthMode('signin', false)).toBe('signin');
  });
});
