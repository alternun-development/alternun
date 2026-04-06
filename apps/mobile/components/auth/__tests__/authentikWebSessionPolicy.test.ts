import { shouldForceFreshAuthentikSocialSession } from '../authentikWebSessionPolicy';

type TestFn = (name: string, fn: () => void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
};

const { describe, expect, it } = globalThis as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('authentikWebSessionPolicy', () => {
  it('forces a fresh Authentik session on web social sign-in', () => {
    expect(shouldForceFreshAuthentikSocialSession('web')).toBe(true);
  });

  it('keeps native social sign-in on the current runtime session', () => {
    expect(shouldForceFreshAuthentikSocialSession('ios')).toBe(false);
    expect(shouldForceFreshAuthentikSocialSession('android')).toBe(false);
  });
});
