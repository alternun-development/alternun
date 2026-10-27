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

test('AuthExchangeService sends the legacy OIDC identity derived from the verified Supabase session', async (t) => {
  const originalEnv = { ...process.env };
  const rpcCalls = [];

  try {
    setEnv({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      AUTH_BETTER_AUTH_URL: undefined,
    });
    mockFetch(t, async (url, init) => {
      if (String(url).includes('/auth/v1/user')) {
        return Response.json({
          id: 'supabase-user-1',
          email: 'ada@example.com',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          app_metadata: { provider: 'authentik' },
          identities: [{ provider: 'authentik', id: 'authentik-user-1' }],
        });
      }

      rpcCalls.push({ url: String(url), body: JSON.parse(init.body) });
      return Response.json([{ id: 'legacy-app-user-42' }]);
    });

    const service = new AuthExchangeService();
    const response = await service.exchangeIdentity(
      {
        externalIdentity: {
          provider: 'authentik',
          providerUserId: 'authentik-user-1',
          email: 'ada@example.com',
          emailVerified: true,
          displayName: 'Ada Lovelace',
          avatarUrl: null,
          rawClaims: { sub: 'untrusted-client-sub', iss: 'https://old.sso.alternun.co/' },
        },
      },
      { authorization: 'Bearer valid-supabase-session' }
    );

    assert.equal(response.appUserId, 'legacy-app-user-42');
    // The verified email also triggers the Airs report claim, which has its own tests.
    assert.deepEqual(
      rpcCalls.map((call) => call.url.split('/rpc/')[1]),
      ['upsert_oidc_user_compat', 'marketplace_claim_airs_reports']
    );
    assert.equal(rpcCalls[0].url, 'https://example.supabase.co/rest/v1/rpc/upsert_oidc_user_compat');
    // The legacy (sub, iss) key comes from the verified Supabase identity, never the body.
    assert.equal(rpcCalls[0].body.p_legacy_sub, 'authentik-user-1');
    assert.equal(
      rpcCalls[0].body.p_legacy_iss,
      'https://testnet.sso.alternun.co/application/o/alternun-mobile/'
    );
  } finally {
    process.env = originalEnv;
  }
});
