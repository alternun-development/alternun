import { isBetterAuthExecutionEnabled, resolvePrimaryOAuthProvider, } from '../authExecutionMode';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
type TestFn = (name: string, fn: () => void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
};

const { describe, expect, it, } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('authExecutionMode', () => {
  const originalExecutionProvider = process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
  const originalAuthExecutionProvider = process.env.AUTH_EXECUTION_PROVIDER;
  const originalPublicBetterAuthUrl = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
  const originalAuthBetterAuthUrl = process.env.AUTH_BETTER_AUTH_URL;
  const originalPrimaryOAuthProvider = process.env.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER;

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

    if (originalPublicBetterAuthUrl === undefined) {
      delete process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
    } else {
      process.env.EXPO_PUBLIC_BETTER_AUTH_URL = originalPublicBetterAuthUrl;
    }

    if (originalAuthBetterAuthUrl === undefined) {
      delete process.env.AUTH_BETTER_AUTH_URL;
    } else {
      process.env.AUTH_BETTER_AUTH_URL = originalAuthBetterAuthUrl;
    }

    if (originalPrimaryOAuthProvider === undefined) {
      delete process.env.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER;
    } else {
      process.env.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER = originalPrimaryOAuthProvider;
    }
  },);

  it('detects better-auth from the public env alias', () => {
    process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER = 'better-auth';

    expect(isBetterAuthExecutionEnabled(),).toBe(true,);
  },);

  it('detects supabase as the legacy execution path', () => {
    process.env.AUTH_EXECUTION_PROVIDER = 'supabase';

    expect(isBetterAuthExecutionEnabled(),).toBe(false,);
  },);

  it('infers better-auth from the public Better Auth url when the flag is missing', () => {
    delete process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
    delete process.env.AUTH_EXECUTION_PROVIDER;
    process.env.EXPO_PUBLIC_BETTER_AUTH_URL = 'https://testnet.api.alternun.co';

    expect(isBetterAuthExecutionEnabled(),).toBe(true,);
  },);

  it('keeps the primary oauth provider on google when better-auth is enabled', () => {
    process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER = 'better-auth';
    process.env.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER = 'keycloak';

    expect(resolvePrimaryOAuthProvider(),).toBe('google',);
  },);

  it('keeps the primary oauth provider on google when the Better Auth url is configured', () => {
    delete process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
    delete process.env.AUTH_EXECUTION_PROVIDER;
    process.env.EXPO_PUBLIC_BETTER_AUTH_URL = 'https://testnet.api.alternun.co';
    process.env.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER = 'keycloak';

    expect(resolvePrimaryOAuthProvider(),).toBe('google',);
  },);

  it('still allows the legacy keycloak alias outside Better Auth mode', () => {
    process.env.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER = 'keycloak';

    expect(resolvePrimaryOAuthProvider(),).toBe('keycloak',);
  },);
},);
