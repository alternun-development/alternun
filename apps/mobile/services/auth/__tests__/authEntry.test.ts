/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  buildAuthentikRelayPath,
  buildAuthentikRelayRoute,
  getAuthentikLoginEntryMode,
  getAuthentikSocialLoginMode,
  normalizeAuthentikLoginEntryMode,
  normalizeAuthentikSocialLoginMode,
  parseAuthentikProviderFlowSlugs,
  resolveAuthentikLoginStrategy,
  resolveAuthentikProviderFlowSlugs,
  shouldUseAuthentikRelayEntry,
} from '../../../../../packages/auth/src/mobile/authEntry';

describe('authEntry', () => {
  const originalMode = process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE;
  const originalSocialMode = process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE;
  const originalExecutionProvider = process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
  const originalAuthExecutionProvider = process.env.AUTH_EXECUTION_PROVIDER;
  const originalFlowSlugs = process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS;
  const originalAllowCustomFlowSlugs =
    process.env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE;
    } else {
      process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE = originalMode;
    }

    if (originalFlowSlugs === undefined) {
      delete process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS;
    } else {
      process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS = originalFlowSlugs;
    }

    if (originalSocialMode === undefined) {
      delete process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE;
    } else {
      process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE = originalSocialMode;
    }

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

    if (originalAllowCustomFlowSlugs === undefined) {
      delete process.env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS;
    } else {
      process.env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS =
        originalAllowCustomFlowSlugs;
    }
  });

  it('defaults to source mode when the env var is absent', () => {
    delete process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE;
    expect(getAuthentikLoginEntryMode()).toBe('source');
  });

  it('accepts explicit source mode', () => {
    process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE = 'source';
    expect(getAuthentikLoginEntryMode()).toBe('source');
  });

  it('normalizes unknown values back to source', () => {
    expect(normalizeAuthentikLoginEntryMode('something-else')).toBe('source');
  });

  it('defaults social login mode to authentik when the env var is absent', () => {
    delete process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE;
    expect(getAuthentikSocialLoginMode()).toBe('authentik');
  });

  it('defaults execution provider to supabase when the env var is absent', () => {
    delete process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
    delete process.env.AUTH_EXECUTION_PROVIDER;

    expect(resolveAuthentikLoginStrategy({}).executionProvider).toBe('supabase');
  });

  it('reads the public execution provider env alias', () => {
    process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER = 'better-auth';

    expect(resolveAuthentikLoginStrategy({}).executionProvider).toBe('better-auth');
  });

  it('disables the Authentik relay entry when Better Auth execution is enabled', () => {
    process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE = 'relay';
    process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER = 'better-auth';

    expect(shouldUseAuthentikRelayEntry()).toBe(false);
  });

  it('normalizes invalid social login modes back to authentik', () => {
    expect(normalizeAuthentikSocialLoginMode('something-else')).toBe('authentik');
  });

  it('builds an app-owned relay path with the provider and next target', () => {
    expect(
      buildAuthentikRelayPath('google', {
        next: '/dashboard?tab=profile',
        forceFreshSession: false,
      })
    ).toBe('/auth-relay?provider=google&next=%2Fdashboard%3Ftab%3Dprofile&fresh=0');
  });

  it('defaults relay routes to a no-logout start', () => {
    expect(buildAuthentikRelayPath('discord')).toBe('/auth-relay?provider=discord&fresh=0');
  });

  it('builds a typed app-owned relay route for expo-router', () => {
    expect(
      buildAuthentikRelayRoute('google', {
        next: '/welcome',
        forceFreshSession: true,
      })
    ).toEqual({
      pathname: '/auth-relay',
      params: {
        provider: 'google',
        fresh: '1',
        next: '/welcome',
      },
    });
  });

  it('parses provider flow slugs from json env', () => {
    expect(
      parseAuthentikProviderFlowSlugs(
        JSON.stringify({
          google: 'alternun-google-login',
          discord: 'alternun-discord-login',
        })
      )
    ).toEqual({
      google: 'alternun-google-login',
      discord: 'alternun-discord-login',
    });
  });

  it('ignores provider flow slugs on localhost', () => {
    expect(
      resolveAuthentikProviderFlowSlugs({
        hostname: 'localhost',
        value: JSON.stringify({ google: 'alternun-google-login' }),
      })
    ).toEqual({});

    expect(
      resolveAuthentikProviderFlowSlugs({
        hostname: '127.0.0.1',
        value: JSON.stringify({ discord: 'alternun-discord-login' }),
      })
    ).toEqual({});
  });

  it('ignores provider flow slugs on non-localhost hosts unless explicitly enabled', () => {
    delete process.env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS;

    expect(
      resolveAuthentikProviderFlowSlugs({
        hostname: 'testnet.airs.alternun.co',
        value: JSON.stringify({ google: 'alternun-google-login' }),
      })
    ).toEqual({});

    expect(
      resolveAuthentikProviderFlowSlugs({
        hostname: 'testnet.airs.alternun.co',
        value: JSON.stringify({ google: 'alternun-google-login' }),
        allowCustomProviderFlowSlugs: true,
      })
    ).toEqual({
      google: 'alternun-google-login',
    });

    expect(
      resolveAuthentikProviderFlowSlugs({
        hostname: 'localhost',
        value: JSON.stringify({ google: 'alternun-google-login' }),
        allowCustomProviderFlowSlugs: true,
      })
    ).toEqual({});
  });

  it('keeps provider flow slugs disabled in the full login strategy unless explicitly allowed', () => {
    delete process.env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS;
    delete process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER;
    delete process.env.AUTH_EXECUTION_PROVIDER;

    expect(
      resolveAuthentikLoginStrategy({
        hostname: 'testnet.airs.alternun.co',
        entryMode: 'relay',
        socialMode: 'authentik',
        providerFlowSlugsValue: JSON.stringify({ google: 'alternun-google-login' }),
      })
    ).toEqual({
      mode: 'relay',
      socialMode: 'authentik',
      executionProvider: 'supabase',
      providerFlowSlugs: {},
    });

    expect(
      resolveAuthentikLoginStrategy({
        hostname: 'testnet.airs.alternun.co',
        entryMode: 'source',
        socialMode: 'supabase',
        providerFlowSlugsValue: JSON.stringify({ google: 'alternun-google-login' }),
        allowCustomProviderFlowSlugs: true,
      })
    ).toEqual({
      mode: 'source',
      socialMode: 'supabase',
      executionProvider: 'supabase',
      providerFlowSlugs: {
        google: 'alternun-google-login',
      },
    });
  });
});
