const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildCompatOidcPayload,
  canonicalIssuerFromEnv,
  createExchangeClaims,
  createExchangePrincipal,
  createExchangeResponse,
  defaultAudienceFromEnv,
  normalizeLinkedAccountType,
} = require('../src/modules/auth-exchange/auth-exchange.mapper.ts');

test('creates a stable principal id and canonical issuer claims', () => {
  const principal = createExchangePrincipal(
    'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
    {
      provider: 'google',
      providerUserId: 'google-123',
      email: 'ada@example.com',
      emailVerified: true,
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://example.com/avatar.png',
      rawClaims: { sub: 'google-123' },
    },
    'app-user-1'
  );

  const claims = createExchangeClaims({
    issuer: principal.issuer,
    principal,
    audience: 'alternun-app',
    issuedAt: new Date('2026-04-09T12:00:00.000Z'),
  });

  assert.equal(principal.issuer, 'https://testnet.sso.alternun.co/application/o/alternun-mobile/');
  assert.match(principal.subject, /^[0-9a-f-]{36}$/);
  assert.equal(principal.metadata.appUserId, 'app-user-1');
  assert.equal(claims.iss, principal.issuer);
  assert.equal(claims.sub, principal.subject);
  assert.equal(claims.aud, 'alternun-app');
  assert.equal(claims.email, 'ada@example.com');
  assert.equal(claims.email_verified, true);
});

test('builds a compatibility OIDC payload for Supabase sync', () => {
  const payload = buildCompatOidcPayload({
    sub: 'google:google-123',
    iss: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
    email: 'ada@example.com',
    emailVerified: true,
    name: 'Ada Lovelace',
    picture: 'https://example.com/avatar.png',
    provider: 'google',
    rawClaims: { sub: 'google-123' },
  });

  assert.match(payload.principalId, /^[0-9a-f-]{36}$/);
  assert.equal(payload.payload.p_iss, 'https://testnet.sso.alternun.co/application/o/alternun-mobile/');
  assert.equal(payload.payload.p_email, 'ada@example.com');
  assert.equal(payload.payload.p_provider, 'google');
});

test('creates a compatibility exchange response with fallback issuer tokens', () => {
  const response = createExchangeResponse({
    issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
    audience: 'alternun-app',
    externalIdentity: {
      provider: 'google',
      providerUserId: 'google-123',
      email: 'ada@example.com',
      emailVerified: true,
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://example.com/avatar.png',
      rawClaims: { sub: 'google-123' },
    },
    executionSession: {
      provider: 'better-auth',
      accessToken: 'execution-token',
      refreshToken: 'execution-refresh',
      idToken: 'execution-id',
      expiresAt: 1730000000,
    },
    appUserId: 'uuid-1',
    syncStatus: 'skipped',
    issuedAt: new Date('2026-04-09T12:00:00.000Z'),
  });

  assert.equal(response.exchangeMode, 'compatibility');
  assert.equal(response.issuerAccessToken, 'execution-token');
  assert.equal(response.issuerRefreshToken, 'execution-refresh');
  assert.equal(response.issuerIdToken, 'execution-id');
  assert.equal(response.principal.metadata.appUserId, 'uuid-1');
  assert.equal(response.linkedAccounts[0].type, 'social');
  assert.equal(response.syncStatus, 'skipped');
});

test('normalizes linked account types and fallback config', () => {
  assert.equal(normalizeLinkedAccountType('google'), 'social');
  assert.equal(normalizeLinkedAccountType('email'), 'password');
  assert.equal(normalizeLinkedAccountType('wallet'), 'wallet');
  assert.equal(normalizeLinkedAccountType('authentik'), 'oidc');

  assert.equal(
    canonicalIssuerFromEnv({
      AUTHENTIK_ISSUER: 'https://auth.example.com/application/o/app/',
    }),
    'https://auth.example.com/application/o/app/'
  );
  assert.equal(defaultAudienceFromEnv({ AUTH_AUDIENCE: 'alternun-app' }), 'alternun-app');
});
