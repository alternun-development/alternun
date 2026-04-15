import { isBetterAuthExecutionEnabled } from '../authExecutionMode';

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

describe('authExecutionMode', () => {
  const originalExecutionProvider = process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
  const originalAuthExecutionProvider = process.env.AUTH_EXECUTION_PROVIDER;

  afterEach(() => {
    if (originalExecutionProvider === undefined) {
      delete process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
    } else {
      process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER = originalExecutionProvider;
    }

    if (originalAuthExecutionProvider === undefined) {
      delete process.env.AUTH_EXECUTION_PROVIDER;
    } else {
      process.env.AUTH_EXECUTION_PROVIDER = originalAuthExecutionProvider;
    }
  });

  it('detects better-auth from the public env alias', () => {
    process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER = 'better-auth';

    expect(isBetterAuthExecutionEnabled()).toBe(true);
  });

  it('detects supabase as the legacy execution path', () => {
    process.env.AUTH_EXECUTION_PROVIDER = 'supabase';

    expect(isBetterAuthExecutionEnabled()).toBe(false);
  });
});
