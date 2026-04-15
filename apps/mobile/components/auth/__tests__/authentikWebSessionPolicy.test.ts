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
  it('does not force a logout on the direct Authentik web path', () => {
    expect(shouldForceFreshAuthentikSocialSession('web', 'authentik')).toBe(false);
  });

  it('still allows the explicit hybrid relay path to force a fresh session', () => {
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
