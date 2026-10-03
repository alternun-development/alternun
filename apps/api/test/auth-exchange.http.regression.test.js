require('reflect-metadata');

const assert = require('node:assert/strict');
const test = require('node:test');
const { Module, ValidationPipe, VersioningType } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');

const {
  AuthExchangeController,
} = require('../src/modules/auth-exchange/auth-exchange.controller.ts');
const { AuthExchangeService } = require('../src/modules/auth-exchange/auth-exchange.service.ts');
const {
  EmailVerificationService,
} = require('../src/modules/auth-exchange/services/email-verification.service.ts');
const { SignInService } = require('../src/modules/auth-exchange/services/signin.service.ts');
const { SignupService } = require('../src/modules/auth-exchange/services/signup.service.ts');
const {
  SocialSignInService,
} = require('../src/modules/auth-exchange/services/social-signin.service.ts');
const { verifyIssuerJwt } = require('../src/modules/auth-exchange/auth-exchange-jwt.ts');

const ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
const BETTER_AUTH_URL = 'https://testnet.api.alternun.co/auth';
const SUPABASE_URL = 'https://project.supabase.co';
const SIGNING_KEY = 'http-regression-test-signing-key';

let app;

class AuthExchangeHttpTestModule {}

Module({
  controllers: [AuthExchangeController],
  providers: [
    AuthExchangeService,
    { provide: SignInService, useValue: {} },
    { provide: SignupService, useValue: {} },
    { provide: SocialSignInService, useValue: {} },
    { provide: EmailVerificationService, useValue: {} },
  ],
})(AuthExchangeHttpTestModule);

function createClientBody(overrides = {}) {
  const externalIdentity = {
    provider: 'google',
    providerUserId: 'google-123',
    email: 'ada@example.com',
    emailVerified: true,
    displayName: 'Ada Lovelace',
    avatarUrl: 'https://example.com/avatar.png',
    rawClaims: { sub: 'google-123' },
  };

  return {
    externalIdentity,
    executionSession: {
      provider: 'better-auth',
      accessToken: 'execution-token',
      refreshToken: 'execution-refresh',
      idToken: 'execution-id',
      expiresAt: 1_730_000_000,
      linkedAccounts: [],
    },
    claims: externalIdentity.rawClaims,
    redirectTo: 'https://testnet.airs.alternun.co/dashboard',
    context: {
      trigger: 'oauth-callback',
      runtime: 'web',
      app: 'mobile',
      authExchangeUrl: 'https://testnet.api.alternun.co/auth/exchange',
    },
    ...overrides,
  };
}

function createSupabaseBody() {
  return createClientBody({
    externalIdentity: {
      provider: 'email',
      providerUserId: 'email-user-123',
      email: 'ada@example.com',
      emailVerified: false,
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://example.com/avatar.png',
      rawClaims: { sub: 'untrusted-sub' },
    },
  });
}

function validBetterAuthSession() {
  return {
    session: {
      id: 'better-auth-session-123',
      userId: 'google-123',
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
    user: {
      id: 'google-123',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada Lovelace',
    },
  };
}

function validSupabaseUser() {
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
  };
}

function setBetterAuthEnv() {
  process.env.AUTHENTIK_ISSUER = ISSUER;
  process.env.AUTH_AUDIENCE = 'alternun-app';
  process.env.AUTHENTIK_JWT_SIGNING_KEY = SIGNING_KEY;
  process.env.AUTH_BETTER_AUTH_URL = BETTER_AUTH_URL;
  delete process.env.BETTER_AUTH_URL;
  delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
  delete process.env.AUTH_SESSION_SIGNING_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.EXPO_PUBLIC_SUPABASE_KEY;
}

function setSupabaseEnv() {
  setBetterAuthEnv();
  delete process.env.AUTH_BETTER_AUTH_URL;
  process.env.EXPO_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.EXPO_PUBLIC_SUPABASE_KEY = 'public-http-test-key';
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

function injectExchange({ headers, payload }) {
  return app.getHttpAdapter().getInstance().inject({
    method: 'POST',
    url: '/auth/exchange',
    headers,
    payload,
  });
}

function parsePayload(response) {
  return JSON.parse(response.payload);
}

test.before(async () => {
  app = await NestFactory.create(AuthExchangeHttpTestModule, new FastifyAdapter(), {
    logger: false,
  });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

test.after(async () => {
  await app?.close();
});

test('POST /auth/exchange returns 401 without Authorization or Cookie headers', async () => {
  const originalEnv = { ...process.env };

  try {
    setBetterAuthEnv();
    const response = await injectExchange({ payload: createClientBody() });

    assert.equal(response.statusCode, 401);
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange accepts the exact legacy client body with a Better Auth bearer', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setBetterAuthEnv();
    mockFetch(t, async () => Response.json(validBetterAuthSession()));
    const response = await injectExchange({
      headers: { authorization: 'Bearer valid-better-auth-session' },
      payload: createClientBody(),
    });
    const body = parsePayload(response);

    assert.equal(response.statusCode, 200);
    assert.equal(body.exchangeMode, 'issuer-owned');
    assert.equal(typeof body.issuerAccessToken, 'string');
    assert.equal(verifyIssuerJwt(body.issuerAccessToken, SIGNING_KEY).claims.iss, ISSUER);
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange accepts a Better Auth cookie and forwards it to verification', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setBetterAuthEnv();
    const cookie = 'better-auth.session_token=valid-cookie-session';
    const fetchMock = mockFetch(t, async () => Response.json(validBetterAuthSession()));
    const response = await injectExchange({
      headers: { cookie },
      payload: createClientBody(),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(
      readRequestHeader(fetchMock.mock.calls[0].arguments[1]?.headers, 'cookie'),
      cookie
    );
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange accepts a verified Supabase bearer', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setSupabaseEnv();
    mockFetch(t, async (url) => {
      assert.equal(String(url), `${SUPABASE_URL}/auth/v1/user`);
      return Response.json(validSupabaseUser());
    });
    const response = await injectExchange({
      headers: { authorization: 'Bearer valid-supabase-session' },
      payload: createSupabaseBody(),
    });
    const body = parsePayload(response);

    assert.equal(response.statusCode, 200);
    assert.equal(typeof body.issuerAccessToken, 'string');
    assert.equal(body.principal.metadata.provider, 'email');
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects an undeclared body property with 400', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setBetterAuthEnv();
    const fetchMock = mockFetch(t, async () => Response.json(validBetterAuthSession()));
    const response = await injectExchange({
      headers: { authorization: 'Bearer valid-better-auth-session' },
      payload: createClientBody({ unexpectedExchangeField: 'must-be-rejected' }),
    });

    assert.equal(response.statusCode, 400);
    assert.equal(fetchMock.mock.callCount(), 0);
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange rejects an invalid bearer without returning a token', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setBetterAuthEnv();
    mockFetch(t, async () => new Response(null, { status: 401 }));
    const response = await injectExchange({
      headers: { authorization: 'Bearer invalid-session' },
      payload: createClientBody(),
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.payload.includes('issuerAccessToken'), false);
    assert.equal(response.payload.includes('issuerIdToken'), false);
  } finally {
    process.env = originalEnv;
  }
});

test('POST /auth/exchange forwards Authorization exactly as received', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setBetterAuthEnv();
    const authorization = 'Bearer exact-client-credential';
    const fetchMock = mockFetch(t, async () => Response.json(validBetterAuthSession()));
    const response = await injectExchange({
      headers: { authorization },
      payload: createClientBody(),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(
      readRequestHeader(fetchMock.mock.calls[0].arguments[1]?.headers, 'authorization'),
      authorization
    );
  } finally {
    process.env = originalEnv;
  }
});
