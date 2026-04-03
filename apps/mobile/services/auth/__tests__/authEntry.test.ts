/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  buildAuthentikRelayPath,
  buildAuthentikRelayRoute,
  getAuthentikLoginEntryMode,
  normalizeAuthentikLoginEntryMode,
} from '../authEntry';

describe('authEntry', () => {
  const originalMode = process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE;
    } else {
      process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE = originalMode;
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
});
