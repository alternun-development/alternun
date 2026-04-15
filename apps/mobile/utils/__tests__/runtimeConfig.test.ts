/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { afterEach, describe, expect, it } from '@jest/globals';
import { resolveMobileApiBaseUrl } from '../runtimeConfig';

describe('resolveMobileApiBaseUrl', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalOrigin = process.env.EXPO_PUBLIC_ORIGIN;

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
});
