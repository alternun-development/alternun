const assert = require('node:assert/strict');
const test = require('node:test');

const {
  handleBetterAuthRuntimeRequest,
  resolveBetterAuthBootstrapConfig,
} = require('../src/common/bootstrap/better-auth-runtime.ts');

function createReply() {
  return {
    statusCode: null,
    headers: {},
    payload: null,
    code(value) {
      this.statusCode = value;
      return this;
    },
    header(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    send(value) {
      this.payload = value;
      return this;
    },
  };
}

test('resolveBetterAuthBootstrapConfig keeps the local external Better Auth proxy target', () => {
  const config = resolveBetterAuthBootstrapConfig({
    BETTER_AUTH_URL: 'http://127.0.0.1:9083',
    AUTH_BETTER_AUTH_URL: 'http://localhost:8082/auth',
    GOOGLE_AUTH_CLIENT_ID: 'example-google-client',
    GOOGLEA_AUTH_CLIENT_SECRET: 'example-google-secret',
  });

  assert.equal(config.mode, 'proxy');
  assert.equal(config.targetBaseUrl, 'http://127.0.0.1:9083');
});

test('resolveBetterAuthBootstrapConfig embeds Better Auth when the public API origin is configured', () => {
  const config = resolveBetterAuthBootstrapConfig({
    AUTH_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
    GOOGLE_AUTH_CLIENT_ID: 'example-google-client',
    GOOGLEA_AUTH_CLIENT_SECRET: 'example-google-secret',
    AUTHENTIK_JWT_SIGNING_KEY: 'issuer-signing-key',
  });

  assert.equal(config.mode, 'embedded');
  assert.equal(config.runtimeConfig.baseURL, 'https://testnet.api.alternun.co');
  assert.equal(
    config.runtimeConfig.trustedOrigins.includes('https://testnet.airs.alternun.co'),
    true
  );
});

test('handleBetterAuthRuntimeRequest forwards Better Auth requests through the embedded runtime', async () => {
  const observed = {
    method: null,
    url: null,
    body: null,
    origin: null,
  };

  const request = {
    method: 'POST',
    raw: {
      url: '/auth/sign-in/social?next=%2Fdashboard',
    },
    headers: {
      origin: 'https://testnet.airs.alternun.co',
      'content-type': 'application/json',
      'x-forwarded-host': 'testnet.api.alternun.co',
      'x-forwarded-proto': 'https',
      cookie: 'better-auth-session=abc',
    },
    body: {
      provider: 'google',
    },
  };

  const reply = createReply();
  const handled = await handleBetterAuthRuntimeRequest(request, reply, {
    baseUrl: 'https://testnet.api.alternun.co',
    authHandler: async (runtimeRequest) => {
      observed.method = runtimeRequest.method;
      observed.url = runtimeRequest.url;
      observed.body = await runtimeRequest.text();
      observed.origin = runtimeRequest.headers.get('origin');

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'better-auth-session=abc; Path=/; HttpOnly',
        },
      });
    },
  });

  assert.equal(handled, true);
  assert.equal(observed.method, 'POST');
  assert.equal(observed.url, 'https://testnet.api.alternun.co/auth/sign-in/social?next=%2Fdashboard');
  assert.equal(observed.origin, 'https://testnet.airs.alternun.co');
  assert.equal(observed.body, JSON.stringify({ provider: 'google' }));
  assert.equal(reply.statusCode, 200);
  assert.equal(reply.headers['content-type'], 'application/json');
  assert.deepEqual(reply.headers['set-cookie'], ['better-auth-session=abc; Path=/; HttpOnly']);
  assert.deepEqual(JSON.parse(reply.payload.toString('utf8')), { ok: true });
});

test('handleBetterAuthRuntimeRequest answers OPTIONS preflight locally', async () => {
  let called = false;

  const handled = await handleBetterAuthRuntimeRequest(
    {
      method: 'OPTIONS',
      raw: {
        url: '/auth/sign-in/social',
      },
      headers: {
        origin: 'https://testnet.airs.alternun.co',
      },
      body: undefined,
    },
    createReply(),
    {
      baseUrl: 'https://testnet.api.alternun.co',
      authHandler: async () => {
        called = true;
        throw new Error('should not run');
      },
    }
  );

  assert.equal(handled, true);
  assert.equal(called, false);
});
