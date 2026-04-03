/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { buildAuthentikOAuthFlowStartUrl } from '../AuthentikOidcClient';

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
});
