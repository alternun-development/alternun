/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from '@jest/globals';
import {
  buildAuthentikLoginEntryUrl,
  resolveAuthentikRedirectUri,
} from '../../../../../packages/auth/src/mobile/authentikUrls';

describe('authentikUrls', () => {
  it('prefers the active localhost browser origin for the web callback route', () => {
    expect(
      resolveAuthentikRedirectUri('https://testnet.airs.alternun.co/', 'http://localhost:8081')
    ).toBe('http://localhost:8081/auth/callback');
  });

  it('builds a direct Authentik source-login URL when no custom flow slug is configured', () => {
    expect(
      buildAuthentikLoginEntryUrl({
        issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
        authorizeUrl:
          'https://testnet.sso.alternun.co/application/o/authorize/?client_id=alternun-mobile',
        providerHint: 'google',
      })
    ).toBe(
      'https://testnet.sso.alternun.co/source/oauth/login/google/?next=https%3A%2F%2Ftestnet.sso.alternun.co%2Fapplication%2Fo%2Fauthorize%2F%3Fclient_id%3Dalternun-mobile'
    );
  });
});
