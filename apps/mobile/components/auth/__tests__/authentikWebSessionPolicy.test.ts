import { shouldForceFreshAuthentikSocialSession } from '../authentikWebSessionPolicy';

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

describe('authentikWebSessionPolicy', () => {
  it('forces a fresh Authentik session on web when social login stays on Authentik', () => {
    expect(shouldForceFreshAuthentikSocialSession('web', 'authentik')).toBe(true);
  });

  it('also forces a fresh Authentik session on web for hybrid mode', () => {
    expect(shouldForceFreshAuthentikSocialSession('web', 'hybrid')).toBe(true);
  });

  it('does not force an Authentik logout when social login bypasses Authentik', () => {
    expect(shouldForceFreshAuthentikSocialSession('web', 'supabase')).toBe(false);
  });

  it('keeps native social sign-in on the current runtime session', () => {
    expect(shouldForceFreshAuthentikSocialSession('ios', 'authentik')).toBe(false);
    expect(shouldForceFreshAuthentikSocialSession('android', 'authentik')).toBe(false);
  });
});
