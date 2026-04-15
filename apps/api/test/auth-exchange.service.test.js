const assert = require('node:assert/strict');
const test = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');

const { AuthExchangeService } = require('../src/modules/auth-exchange/auth-exchange.service.ts');

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`Expected a JWT, got ${token}`);
  }

  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
}

test('AuthExchangeService builds a compatibility response when Supabase sync is absent', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.AUTHENTIK_ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
    process.env.AUTH_AUDIENCE = 'alternun-app';
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    const service = new AuthExchangeService();
    const response = await service.exchangeIdentity({
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
      context: {
        trigger: 'oauth-callback',
        runtime: 'web',
        app: 'mobile',
      },
    });

    assert.equal(response.syncStatus, 'skipped');
    assert.equal(response.exchangeMode, 'compatibility');
    assert.equal(response.issuerAccessToken, 'execution-token');
    assert.equal(response.principal.issuer, 'https://testnet.sso.alternun.co/application/o/alternun-mobile/');
    assert.equal(response.claims.aud, 'alternun-app');
    assert.equal(response.claims.email, 'ada@example.com');
  } finally {
    process.env = originalEnv;
  }
});

test('AuthExchangeService mints issuer-owned tokens when a signing key is configured', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.AUTHENTIK_ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
    process.env.AUTH_AUDIENCE = 'alternun-app';
    process.env.AUTHENTIK_JWT_SIGNING_KEY = 'test-signing-key';
    process.env.AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED = 'true';
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    const service = new AuthExchangeService();
    const response = await service.exchangeIdentity({
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
      context: {
        trigger: 'oauth-callback',
        runtime: 'web',
        app: 'mobile',
      },
    });

    assert.equal(response.exchangeMode, 'issuer-owned');
    assert.match(response.issuerAccessToken, /^[^.]+\.[^.]+\.[^.]+$/);
    assert.match(response.issuerIdToken ?? '', /^[^.]+\.[^.]+\.[^.]+$/);

    const accessClaims = decodeJwt(response.issuerAccessToken);
    const idClaims = decodeJwt(response.issuerIdToken);
    assert.equal(accessClaims.iss, 'https://testnet.sso.alternun.co/application/o/alternun-mobile/');
    assert.equal(accessClaims.sub, response.principal.subject);
    assert.equal(accessClaims.aud, 'alternun-app');
    assert.equal(accessClaims.token_use, 'access');
    assert.equal(accessClaims.email, 'ada@example.com');
    assert.equal(idClaims.token_use, 'id');
    assert.equal(idClaims.principal_id, response.principal.subject);
    assert.equal(response.issuerRefreshToken, null);
  } finally {
    process.env = originalEnv;
  }
});

test('AuthExchangeService fails closed when issuer-owned exchange is required but the signing key is missing', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.AUTHENTIK_ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
    process.env.AUTH_AUDIENCE = 'alternun-app';
    process.env.AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED = 'true';
    delete process.env.AUTHENTIK_JWT_SIGNING_KEY;
    delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
    delete process.env.AUTH_SESSION_SIGNING_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    const service = new AuthExchangeService();

    await assert.rejects(
      service.exchangeIdentity({
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
        context: {
          trigger: 'oauth-callback',
          runtime: 'web',
          app: 'mobile',
        },
      }),
      (error) =>
        error instanceof ServiceUnavailableException &&
        error.getStatus() === 503 &&
        String(error.message).includes('AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED')
    );
  } finally {
    process.env = originalEnv;
  }
});
