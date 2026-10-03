const assert = require('node:assert/strict');
const test = require('node:test');

const { AuthExchangeService } = require('../src/modules/auth-exchange/auth-exchange.service.ts');

function createBody(overrides = {}) {
  return {
    externalIdentity: {
      provider: 'google',
      providerUserId: 'better-auth-user-123',
      email: 'ada@example.com',
      emailVerified: false,
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://example.com/avatar.png',
      rawClaims: { untrusted: true },
      ...overrides,
    },
    executionSession: {
      provider: 'better-auth',
      accessToken: 'untrusted-execution-token',
      refreshToken: 'untrusted-refresh-token',
      idToken: 'untrusted-id-token',
      expiresAt: 1_900_000_000,
    },
    context: {
      trigger: 'oauth-callback',
      runtime: 'web',
      app: 'mobile',
      audience: 'untrusted-audience',
    },
  };
}

function setEnv(overrides = {}) {
  process.env.AUTHENTIK_ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
  process.env.AUTH_AUDIENCE = 'alternun-app';
  process.env.AUTH_BETTER_AUTH_URL = 'https://testnet.api.alternun.co/auth';
  process.env.AUTHENTIK_JWT_SIGNING_KEY = 'test-signing-key';
  delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
  delete process.env.AUTH_SESSION_SIGNING_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function validSession() {
  return {
    session: {
      userId: 'better-auth-user-123',
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
    user: {
      id: 'better-auth-user-123',
      email: 'ada@example.com',
      emailVerified: true,
    },
  };
}

function mockFetch(t, handler) {
  const mocked = t.mock.method(globalThis, 'fetch', handler);
  t.after(() => mocked.mock.restore());
  return mocked;
}

function hasStatus(status) {
  return (error) => typeof error?.getStatus === 'function' && error.getStatus() === status;
}

test('AuthExchangeService rejects an exchange without a verified request credential', async () => {
  const originalEnv = { ...process.env };

  try {
    setEnv();
    const service = new AuthExchangeService();

    await assert.rejects(service.exchangeIdentity(createBody()), hasStatus(401));
  } finally {
    process.env = originalEnv;
  }
});

test('AuthExchangeService mints issuer-owned tokens from verified session data', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setEnv();
    mockFetch(t, async () => Response.json(validSession()));
    const service = new AuthExchangeService();
    const response = await service.exchangeIdentity(createBody(), {
      authorization: 'Bearer valid-better-auth-session',
    });

    assert.equal(response.exchangeMode, 'issuer-owned');
    assert.match(response.issuerAccessToken, /^[^.]+\.[^.]+\.[^.]+$/);
    assert.match(response.issuerIdToken ?? '', /^[^.]+\.[^.]+\.[^.]+$/);
    assert.notEqual(response.issuerAccessToken, 'untrusted-execution-token');
    assert.equal(response.claims.aud, 'alternun-app');
    assert.equal(response.claims.email, 'ada@example.com');
    assert.equal(response.claims.email_verified, true);
    assert.deepEqual(response.principal.metadata.rawClaims, {});
  } finally {
    process.env = originalEnv;
  }
});

test('AuthExchangeService returns 503 after verification when the signing key is missing', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setEnv({ AUTHENTIK_JWT_SIGNING_KEY: undefined });
    mockFetch(t, async () => Response.json(validSession()));
    const service = new AuthExchangeService();

    await assert.rejects(
      service.exchangeIdentity(createBody(), {
        authorization: 'Bearer valid-better-auth-session',
      }),
      hasStatus(503)
    );
  } finally {
    process.env = originalEnv;
  }
});
