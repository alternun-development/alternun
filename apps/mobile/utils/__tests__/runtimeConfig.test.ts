/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { afterEach, describe, expect, it } from '@jest/globals';
import { resolveMobileApiBaseUrl, resolveMobileBetterAuthBaseUrl } from '../runtimeConfig';

describe('resolveMobileApiBaseUrl', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalOrigin = process.env.EXPO_PUBLIC_ORIGIN;
  const originalBetterAuthUrl = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    }

    if (originalOrigin === undefined) {
      delete process.env.EXPO_PUBLIC_ORIGIN;
    } else {
      process.env.EXPO_PUBLIC_ORIGIN = originalOrigin;
    }

    if (originalBetterAuthUrl === undefined) {
      delete process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
    } else {
      process.env.EXPO_PUBLIC_BETTER_AUTH_URL = originalBetterAuthUrl;
    }
  });

  it('prefers an explicit api url and strips trailing slashes', () => {
    expect(resolveMobileApiBaseUrl('https://custom.example/')).toBe('https://custom.example');
  });

  it('derives the stage api host from the active app origin', () => {
    process.env.EXPO_PUBLIC_API_URL = '';

    expect(resolveMobileApiBaseUrl(undefined, 'https://testnet.airs.alternun.co')).toBe(
      'https://testnet.api.alternun.co'
    );
  });

  it('maps loopback origins to the local api port', () => {
    process.env.EXPO_PUBLIC_API_URL = '';

    expect(resolveMobileApiBaseUrl(undefined, 'http://localhost:8081')).toBe(
      'http://localhost:8082'
    );
  });

  it('prefers a loopback origin over a stale non-local api url', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://testnet.api.alternun.co';

    expect(resolveMobileApiBaseUrl(undefined, 'http://localhost:8081')).toBe(
      'http://localhost:8082'
    );
  });

  it('prefers the derived testnet api origin over a stale loopback api url', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8082';

    expect(resolveMobileApiBaseUrl(undefined, 'https://testnet.airs.alternun.co')).toBe(
      'https://testnet.api.alternun.co'
    );
  });

  it('prefers the loopback api origin for Better Auth even when the env points at testnet', () => {
    process.env.EXPO_PUBLIC_BETTER_AUTH_URL = 'https://testnet.api.alternun.co/auth';

    expect(resolveMobileBetterAuthBaseUrl(undefined, 'http://localhost:8081')).toBe(
      'http://localhost:8082'
    );
  });

  it('keeps the configured Better Auth origin for deployed app origins', () => {
    process.env.EXPO_PUBLIC_BETTER_AUTH_URL = 'https://testnet.api.alternun.co/auth';

    expect(resolveMobileBetterAuthBaseUrl(undefined, 'https://testnet.airs.alternun.co')).toBe(
      'https://testnet.api.alternun.co'
    );
  });

  it('prefers the derived testnet Better Auth origin over a stale loopback auth url', () => {
    process.env.EXPO_PUBLIC_BETTER_AUTH_URL = 'http://localhost:8082/auth';

    expect(resolveMobileBetterAuthBaseUrl(undefined, 'https://testnet.airs.alternun.co')).toBe(
      'https://testnet.api.alternun.co'
    );
  });
});
