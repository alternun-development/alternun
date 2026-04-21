import {
  buildWebAuthCallbackRedirectPath,
  resolveAuthCallbackSuccessVariant,
} from '../authCallbackFlow';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
type TestFn = (name: string, fn: () => void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
};

const { describe, expect, it } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('authCallbackFlow', () => {
  it('builds a callback redirect path when the URL hash contains auth tokens', () => {
    expect(
      buildWebAuthCallbackRedirectPath(
        '?next=%2Fdashboard',
        '#access_token=token-1&refresh_token=token-2&type=signup'
      )
    ).toBe(
      '/auth/callback?next=%2Fdashboard#access_token=token-1&refresh_token=token-2&type=signup'
    );
  });

  it('returns null when the URL has no auth callback payload', () => {
    expect(buildWebAuthCallbackRedirectPath('?next=%2Fdashboard', '#state=abc')).toBe(null);
  });

  it('routes recovery callback payloads to the standalone reset page', () => {
    expect(
      buildWebAuthCallbackRedirectPath(
        '?next=%2Fdashboard',
        '#access_token=token-1&refresh_token=token-2&type=recovery'
      )
    ).toBe(
      '/auth/reset-password?next=%2Fdashboard#access_token=token-1&refresh_token=token-2&type=recovery'
    );
  });

  it('maps signup and recovery callback types to the matching success copy variant', () => {
    expect(resolveAuthCallbackSuccessVariant('signup')).toBe('signup');
    expect(resolveAuthCallbackSuccessVariant('recovery')).toBe('recovery');
    expect(resolveAuthCallbackSuccessVariant('reset_password')).toBe('recovery');
    expect(resolveAuthCallbackSuccessVariant('callback')).toBe('default');
  });
});
