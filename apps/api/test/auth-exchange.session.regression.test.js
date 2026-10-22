require('reflect-metadata');

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AuthExchangeController,
} = require('../src/modules/auth-exchange/auth-exchange.controller.ts');
const { AuthExchangeService } = require('../src/modules/auth-exchange/auth-exchange.service.ts');
const { verifyIssuerJwt } = require('../src/modules/auth-exchange/auth-exchange-jwt.ts');

const ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
const BETTER_AUTH_URL = 'https://testnet.api.alternun.co/auth';
const SUPABASE_URL = 'https://project.supabase.co';
const SIGNING_KEY = 'regression-test-signing-key';

function createExternalIdentity(overrides = {}) {
  return {
    provider: 'google',
    providerUserId: 'better-auth-user-123',
    email: 'ada@example.com',
    emailVerified: false,
    displayName: 'Ada Lovelace',
    avatarUrl: 'https://example.com/avatar.png',
    rawClaims: { sub: 'untrusted-sub', admin: true },
    ...overrides,
  };
}

function createExchangeBody(overrides = {}) {
  return {
    externalIdentity: createExternalIdentity(),
    executionSession: {
      provider: 'better-auth',
      accessToken: 'untrusted-execution-token',
      refreshToken: 'untrusted-refresh-token',
      idToken: 'untrusted-id-token',
      expiresAt: 1_900_000_000,
      linkedAccounts: [],
    },
    context: {
      trigger: 'oauth-callback',
      runtime: 'web',
      app: 'mobile',
      audience: 'untrusted-audience',
      issuerAccessToken: 'untrusted-issuer-token',
    },
    ...overrides,
  };
}

function createController() {
  return new AuthExchangeController(new AuthExchangeService());
}

function setExchangeEnv(overrides = {}) {
  process.env.AUTHENTIK_ISSUER = ISSUER;
  process.env.AUTH_AUDIENCE = 'alternun-app';
  process.env.AUTH_BETTER_AUTH_URL = BETTER_AUTH_URL;
  process.env.AUTHENTIK_JWT_SIGNING_KEY = SIGNING_KEY;
  process.env.AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED = 'true';
  delete process.env.BETTER_AUTH_URL;
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

function setSupabaseEnv(overrides = {}) {
  setExchangeEnv({
    AUTH_BETTER_AUTH_URL: undefined,
    BETTER_AUTH_URL: undefined,
    EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_KEY: 'public-test-key',
    ...overrides,
  });
}

function validBetterAuthSession(overrides = {}) {
  const user = {
    id: 'better-auth-user-123',
    email: 'ada@example.com',
    emailVerified: true,
    name: 'Ada Lovelace',
    ...overrides,
  };

  return {
    session: {
      id: 'better-auth-session-123',
      userId: user.id,
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
    user,
  };
}

function validSupabaseUser(overrides = {}) {
  return {
    id: 'email-user-123',
    email: 'ada@example.com',
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    identities: [
      {
        id: 'email-user-123',
        user_id: 'email-user-123',
        provider: 'email',
      },
    ],
    ...overrides,
  };
}

function supabaseBody(overrides = {}) {
  return createExchangeBody({
    externalIdentity: createExternalIdentity({
      provider: 'email',
      providerUserId: 'email-user-123',
      ...overrides,
    }),
  });
}

function mockFetch(t, handler) {
  const mocked = t.mock.method(globalThis, 'fetch', handler);
  t.after(() => mocked.mock.restore());
  return mocked;
}

function readRequestHeader(headers, name) {
  if (headers instanceof Headers) return headers.get(name);
  const entry = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );
  return entry?.[1] ?? null;
}

function assertHttpStatus(expectedStatus) {
  return (error) => typeof error?.getStatus === 'function' && error.getStatus() === expectedStatus;
}

function assertIssuerOwned(response, expectedEmail = 'ada@example.com') {
  assert.equal(response.exchangeMode, 'issuer-owned');
  assert.notEqual(response.issuerAccessToken, 'untrusted-execution-token');
  const verified = verifyIssuerJwt(response.issuerAccessToken, SIGNING_KEY);
  assert.equal(verified.claims.iss, ISSUER);
  assert.equal(verified.claims.aud, 'alternun-app');
  assert.equal(verified.claims.email, expectedEmail);
  return verified;
}

test('POST /auth/exchange rejects a request without a bearer or Better Auth cookie with 401', async () => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    await assert.rejects(createController().exchange(createExchangeBody()), assertHttpStatus(401));
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange does not authenticate with executionSession.accessToken', async () => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    await assert.rejects(createController().exchange(createExchangeBody()), assertHttpStatus(401));
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects an invalid or expired Better Auth bearer with 401', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    const fetchMock = mockFetch(t, async () => new Response(null, { status: 401 }));

    await assert.rejects(
      createController().exchange(createExchangeBody(), 'Bearer invalid-or-expired-session'),
      assertHttpStatus(401)
    );
    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(String(url), `${BETTER_AUTH_URL}/get-session`);
    assert.equal(
      readRequestHeader(init?.headers, 'authorization'),
      'Bearer invalid-or-expired-session'
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange mints an issuer token for a valid Better Auth cookie session', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    const fetchMock = mockFetch(t, async () => Response.json(validBetterAuthSession()));
    const response = await createController().exchange(
      createExchangeBody(),
      undefined,
      'better-auth.session_token=valid-session'
    );

    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(String(url), `${BETTER_AUTH_URL}/get-session`);
    assert.equal(
      readRequestHeader(init?.headers, 'cookie'),
      'better-auth.session_token=valid-session'
    );
    const verified = assertIssuerOwned(response);
    assert.equal(verified.claims.email_verified, true);
    assert.deepEqual(response.principal.metadata.rawClaims, {});
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange mints an issuer token for a valid Better Auth bearer', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    const fetchMock = mockFetch(t, async () => Response.json(validBetterAuthSession()));
    const response = await createController().exchange(
      createExchangeBody(),
      'Bearer valid-better-auth-session'
    );

    assertIssuerOwned(response);
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(
      readRequestHeader(fetchMock.mock.calls[0].arguments[1]?.headers, 'authorization'),
      'Bearer valid-better-auth-session'
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects a Better Auth user id mismatch', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    mockFetch(t, async () => Response.json(validBetterAuthSession({ id: 'different-user' })));
    await assert.rejects(
      createController().exchange(createExchangeBody(), 'Bearer valid-but-different-user'),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects a Better Auth email mismatch', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    mockFetch(t, async () =>
      Response.json(validBetterAuthSession({ email: 'different@example.com' }))
    );
    await assert.rejects(
      createController().exchange(createExchangeBody(), 'Bearer valid-better-auth-session'),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange compares Better Auth email case-insensitively', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    mockFetch(t, async () => Response.json(validBetterAuthSession({ email: 'Ada@Example.COM' })));
    const response = await createController().exchange(
      createExchangeBody({
        externalIdentity: createExternalIdentity({ email: 'ADA@example.com' }),
      }),
      'Bearer valid-better-auth-session'
    );

    assertIssuerOwned(response, 'ada@example.com');
  } finally {
    process.env = originalEnv;
  }
});

for (const provider of ['google', 'discord', 'email', 'github']) {
  test(`POST /auth/exchange accepts the known Better Auth provider ${provider}`, async (t) => {
    const originalEnv = { ...process.env };

    try {
      setExchangeEnv();
      const fetchMock = mockFetch(t, async () => Response.json(validBetterAuthSession()));
      const response = await createController().exchange(
        createExchangeBody({
          externalIdentity: createExternalIdentity({ provider }),
        }),
        'Bearer valid-better-auth-session'
      );

      assertIssuerOwned(response);
      assert.equal(response.principal.metadata.provider, provider);
      assert.equal(fetchMock.mock.callCount(), 1);
      assert.equal(String(fetchMock.mock.calls[0].arguments[0]), `${BETTER_AUTH_URL}/get-session`);
    } finally {
      process.env = originalEnv;
    }
  });
}

test('POST /auth/exchange rejects an unknown Better Auth provider with 401', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    mockFetch(t, async () => Response.json(validBetterAuthSession()));
    await assert.rejects(
      createController().exchange(
        createExchangeBody({
          externalIdentity: createExternalIdentity({ provider: 'unknown-provider' }),
        }),
        'Bearer valid-better-auth-session'
      ),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects wallet:metamask for a Better Auth session with 401', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    mockFetch(t, async () => Response.json(validBetterAuthSession()));
    await assert.rejects(
      createController().exchange(
        createExchangeBody({
          externalIdentity: createExternalIdentity({ provider: 'wallet:metamask' }),
        }),
        'Bearer valid-better-auth-session'
      ),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange accepts a server-verified Supabase bearer', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    const fetchMock = mockFetch(t, async () => Response.json(validSupabaseUser()));
    const response = await createController().exchange(
      supabaseBody(),
      'Bearer valid-supabase-token'
    );

    assertIssuerOwned(response);
    assert.equal(response.principal.metadata.provider, 'email');
    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(String(url), `${SUPABASE_URL}/auth/v1/user`);
    assert.equal(readRequestHeader(init?.headers, 'authorization'), 'Bearer valid-supabase-token');
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange treats supabase and email as the same canonical provider', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => Response.json(validSupabaseUser()));
    const response = await createController().exchange(
      supabaseBody({ provider: 'supabase' }),
      'Bearer valid-supabase-token'
    );

    assertIssuerOwned(response);
    assert.equal(response.principal.metadata.provider, 'email');
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects an invalid Supabase bearer with 401', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => new Response(null, { status: 401 }));
    await assert.rejects(
      createController().exchange(supabaseBody(), 'Bearer invalid-supabase-token'),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects an expired Supabase bearer with 401', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => new Response(null, { status: 401 }));
    await assert.rejects(
      createController().exchange(supabaseBody(), 'Bearer expired-supabase-token'),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange returns 503 when Supabase verification configuration is absent', async () => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv({
      EXPO_PUBLIC_SUPABASE_URL: undefined,
      EXPO_PUBLIC_SUPABASE_KEY: undefined,
    });
    await assert.rejects(
      createController().exchange(supabaseBody(), 'Bearer otherwise-valid-token'),
      assertHttpStatus(503)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange returns 503 for an invalid Supabase user response', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => Response.json({ id: 'email-user-123', email: 'ada@example.com' }));
    await assert.rejects(
      createController().exchange(supabaseBody(), 'Bearer valid-supabase-token'),
      assertHttpStatus(503)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange returns 503 when Supabase verification has a network error', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => {
      throw new Error('simulated network failure');
    });
    await assert.rejects(
      createController().exchange(supabaseBody(), 'Bearer valid-supabase-token'),
      assertHttpStatus(503)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects a Supabase user id mismatch', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () =>
      Response.json(
        validSupabaseUser({
          id: 'different-user',
          identities: [{ id: 'different-user', user_id: 'different-user', provider: 'email' }],
        })
      )
    );
    await assert.rejects(
      createController().exchange(supabaseBody(), 'Bearer valid-supabase-token'),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects a Supabase email mismatch', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => Response.json(validSupabaseUser({ email: 'different@example.com' })));
    await assert.rejects(
      createController().exchange(supabaseBody(), 'Bearer valid-supabase-token'),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects a Supabase provider mismatch', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => Response.json(validSupabaseUser()));
    await assert.rejects(
      createController().exchange(
        supabaseBody({ provider: 'google' }),
        'Bearer valid-supabase-token'
      ),
      assertHttpStatus(401)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange normalizes uppercase Supabase email and trusts confirmation state', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async () => Response.json(validSupabaseUser({ email: 'Ada@Example.COM' })));
    const response = await createController().exchange(
      supabaseBody({ email: 'ADA@example.com', emailVerified: false }),
      'Bearer valid-supabase-token'
    );

    const verified = assertIssuerOwned(response, 'ada@example.com');
    assert.equal(verified.claims.email_verified, true);
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange returns 503 without a signing key even when strict mode is false', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv({
      AUTHENTIK_JWT_SIGNING_KEY: undefined,
      AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED: 'false',
    });
    mockFetch(t, async () => Response.json(validBetterAuthSession()));
    await assert.rejects(
      createController().exchange(createExchangeBody(), 'Bearer valid-better-auth-session'),
      assertHttpStatus(503)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange does not accept an issuer token as execution proof', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    let requestCount = 0;
    mockFetch(t, async () => {
      requestCount += 1;
      return requestCount === 1
        ? Response.json(validBetterAuthSession())
        : new Response(null, { status: 401 });
    });
    const issued = await createController().exchange(
      createExchangeBody(),
      'Bearer valid-better-auth-session'
    );

    await assert.rejects(
      createController().exchange(createExchangeBody(), `Bearer ${issued.issuerAccessToken}`),
      assertHttpStatus(401)
    );
    assert.equal(requestCount, 2);
  } finally {
    process.env = originalEnv;
  }
});
