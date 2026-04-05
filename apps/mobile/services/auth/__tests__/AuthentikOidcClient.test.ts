/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  buildAuthentikOAuthFlowStartUrl,
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
  resolveAuthentikRedirectUri,
} from '../../../../../packages/auth/src/mobile/authentikUrls';

describe('buildAuthentikOAuthFlowStartUrl', () => {
  const issuer = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
  const clientId = 'alternun-mobile';
  const redirectUri = 'https://testnet.airs.alternun.co/';
  const state = 'state-123';
  const codeChallenge = 'challenge-123';

  it('starts google sign-in through the direct source login route', () => {
    const url = buildAuthentikOAuthFlowStartUrl({
      providerHint: 'google',
      issuer,
      clientId,
      redirectUri,
      state,
      codeChallenge,
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://testnet.sso.alternun.co');
    expect(parsed.pathname).toBe('/source/oauth/login/google/');
    expect(parsed.searchParams.get('next')).toContain('/application/o/authorize/?');
    expect(parsed.searchParams.get('next')).toContain('client_id=alternun-mobile');
    expect(parsed.searchParams.get('next')).toContain('state=state-123');
  });

  it('starts discord sign-in through the direct source login route', () => {
    const url = buildAuthentikOAuthFlowStartUrl({
      providerHint: 'discord',
      issuer,
      clientId,
      redirectUri,
      state,
      codeChallenge,
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://testnet.sso.alternun.co');
    expect(parsed.pathname).toBe('/source/oauth/login/discord/');
    expect(parsed.searchParams.get('next')).toContain('/application/o/authorize/?');
    expect(parsed.searchParams.get('next')).toContain('client_id=alternun-mobile');
    expect(parsed.searchParams.get('next')).toContain('state=state-123');
  });

  it('still allows an explicit provider flow slug when configured', () => {
    const url = buildAuthentikOAuthFlowStartUrl({
      providerHint: 'google',
      issuer,
      clientId,
      redirectUri,
      state,
      codeChallenge,
      providerFlowSlugs: { google: 'alternun-google-login' },
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://testnet.sso.alternun.co');
    expect(parsed.pathname).toBe('/if/flow/alternun-google-login/');
    expect(parsed.searchParams.get('next')).toContain('/application/o/authorize/?');
  });

  it('derives a redirect uri from the current origin when the explicit value is missing', () => {
    expect(resolveAuthentikRedirectUri(undefined, 'https://testnet.airs.alternun.co')).toBe(
      'https://testnet.airs.alternun.co/'
    );
  });

  it('preserves an explicit redirect uri when provided', () => {
    expect(
      resolveAuthentikRedirectUri(
        'https://testnet.airs.alternun.co/auth/callback',
        'https://ignored.example'
      )
    ).toBe('https://testnet.airs.alternun.co/auth/callback');
  });

  it('prefers the active browser origin over a loopback redirect uri during local dev', () => {
    expect(resolveAuthentikRedirectUri('http://localhost:8081/', 'http://localhost:8083')).toBe(
      'http://localhost:8083/'
    );
  });

  it('defaults the authentik client id when explicit value is missing', () => {
    expect(resolveAuthentikClientId(undefined)).toBe('alternun-mobile');
  });

  it('derives the authentik issuer from the deployed origin when explicit value is missing', () => {
    expect(resolveAuthentikIssuer(undefined, 'https://testnet.airs.alternun.co')).toBe(
      'https://testnet.sso.alternun.co/application/o/alternun-mobile/'
    );
  });

  it('preserves an explicit authentik issuer when provided', () => {
    expect(
      resolveAuthentikIssuer(
        'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
        'https://ignored.example'
      )
    ).toBe('https://testnet.sso.alternun.co/application/o/alternun-mobile/');
  });
});
