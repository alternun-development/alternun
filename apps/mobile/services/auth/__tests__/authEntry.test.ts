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
} from '@alternun/auth/mobile/authEntry';

describe('authEntry', () => {
  const originalMode = process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE;
  const originalSocialMode = process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE;
  const originalFlowSlugs = process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS;

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
  });

  it('defaults to relay mode when the env var is absent', () => {
    delete process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE;
    expect(getAuthentikLoginEntryMode()).toBe('relay');
  });

  it('accepts explicit source mode', () => {
    process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE = 'source';
    expect(getAuthentikLoginEntryMode()).toBe('source');
  });

  it('normalizes unknown values back to relay', () => {
    expect(normalizeAuthentikLoginEntryMode('something-else')).toBe('relay');
  });

  it('defaults social login mode to hybrid when the env var is absent', () => {
    delete process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE;
    expect(getAuthentikSocialLoginMode()).toBe('hybrid');
  });

  it('normalizes invalid social login modes back to hybrid', () => {
    expect(normalizeAuthentikSocialLoginMode('something-else')).toBe('hybrid');
  });

  it('builds an app-owned relay path with the provider and next target', () => {
    expect(
      buildAuthentikRelayPath('google', {
        next: '/dashboard?tab=profile',
        forceFreshSession: false,
      })
    ).toBe('/auth-relay?provider=google&next=%2Fdashboard%3Ftab%3Dprofile&fresh=0');
  });

  it('defaults relay routes to a fresh session start', () => {
    expect(buildAuthentikRelayPath('discord')).toBe('/auth-relay?provider=discord&fresh=1');
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

  it('keeps provider flow slugs on non-localhost hosts', () => {
    expect(
      resolveAuthentikProviderFlowSlugs({
        hostname: 'testnet.airs.alternun.co',
        value: JSON.stringify({ google: 'alternun-google-login' }),
      })
    ).toEqual({
      google: 'alternun-google-login',
    });
  });

  it('resolves a full login strategy for testnet and localhost', () => {
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
      providerFlowSlugs: {
        google: 'alternun-google-login',
      },
    });

    expect(
      resolveAuthentikLoginStrategy({
        hostname: 'localhost',
        entryMode: 'source',
        socialMode: 'supabase',
        providerFlowSlugsValue: JSON.stringify({ google: 'alternun-google-login' }),
      })
    ).toEqual({
      mode: 'source',
      socialMode: 'supabase',
      providerFlowSlugs: {},
    });
  });
});
