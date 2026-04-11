import { shouldClearOidcSessionOnAuthStateChange } from '../authSessionBridge';

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

describe('authSessionBridge', () => {
  it('does not treat the initial null auth state as a sign-out', () => {
    expect(
      shouldClearOidcSessionOnAuthStateChange({
        hasReceivedAuthState: false,
        previousUser: undefined,
        nextUser: null,
      })
    ).toBe(false);
  });

  it('clears the OIDC session only after a real authenticated-to-null transition', () => {
    expect(
      shouldClearOidcSessionOnAuthStateChange({
        hasReceivedAuthState: true,
        previousUser: {
          id: 'user-1',
          email: 'ada@example.com',
        } as never,
        nextUser: null,
      })
    ).toBe(true);
  });
});
