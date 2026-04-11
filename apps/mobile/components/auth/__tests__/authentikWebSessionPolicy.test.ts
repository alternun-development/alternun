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
  it('forces a fresh Authentik session on web social sign-in for legacy execution', () => {
    expect(shouldForceFreshAuthentikSocialSession('web', 'supabase')).toBe(true);
  });

  it('does not force an Authentik logout when Better Auth is the execution provider', () => {
    expect(shouldForceFreshAuthentikSocialSession('web', 'better-auth')).toBe(false);
  });

  it('keeps native social sign-in on the current runtime session', () => {
    expect(shouldForceFreshAuthentikSocialSession('ios')).toBe(false);
    expect(shouldForceFreshAuthentikSocialSession('android')).toBe(false);
  });
});
