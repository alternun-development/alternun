const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildBetterAuthProxyTargetUrl,
  proxyBetterAuthRequest,
  shouldProxyBetterAuthPath,
} = require('../src/common/bootstrap/better-auth-proxy.ts');

function createReply() {
  return {
    statusCode: null,
    headers: {},
    payload: null,
    code(value) {
      this.statusCode = value;
      return this;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
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

test('shouldProxyBetterAuthPath skips /auth/exchange', () => {
  assert.equal(shouldProxyBetterAuthPath('/auth/sign-in/social'), true);
  assert.equal(shouldProxyBetterAuthPath('/auth/sign-in/email'), false);
  assert.equal(shouldProxyBetterAuthPath('/auth/sign-up/email'), false);
  assert.equal(shouldProxyBetterAuthPath('/auth/exchange'), false);
  assert.equal(shouldProxyBetterAuthPath('/auth/exchange/'), false);
});

test('buildBetterAuthProxyTargetUrl preserves the canonical /auth prefix', () => {
  const target = buildBetterAuthProxyTargetUrl(
    '/auth/sign-in/social?next=%2Fdashboard',
    'http://127.0.0.1:8084'
  );

  assert.equal(target, 'http://127.0.0.1:8084/auth/sign-in/social?next=%2Fdashboard');
});

test('proxyBetterAuthRequest forwards the request and preserves cookies', async () => {
  const observed = {
    url: null,
    init: null,
  };

  const responseBytes = Buffer.from(JSON.stringify({ ok: true }), 'utf8');

  const fetchFn = async (url, init) => {
    observed.url = String(url);
    observed.init = init;

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        entries() {
          return [
            ['content-type', 'application/json'],
            ['cache-control', 'no-store'],
          ][Symbol.iterator]();
        },
        getSetCookie() {
          return ['better-auth-session=abc; Path=/; HttpOnly'];
        },
      },
      async arrayBuffer() {
        return responseBytes.buffer.slice(
          responseBytes.byteOffset,
          responseBytes.byteOffset + responseBytes.byteLength
        );
      },
    };
  };

  const request = {
    method: 'POST',
    raw: {
      url: '/auth/sign-in/social?next=%2Fdashboard',
    },
    headers: {
      origin: 'http://localhost:8081',
      'content-type': 'application/json',
      cookie: 'session=abc',
      host: 'localhost:8082',
    },
    body: {
      provider: 'google',
    },
  };

  const reply = createReply();
  const handled = await proxyBetterAuthRequest(request, reply, 'http://127.0.0.1:8084', fetchFn);

  assert.equal(handled, true);
  assert.equal(observed.url, 'http://127.0.0.1:8084/auth/sign-in/social?next=%2Fdashboard');
  assert.equal(observed.init.method, 'POST');
  assert.equal(observed.init.redirect, 'manual');
  assert.equal(observed.init.body, JSON.stringify({ provider: 'google' }));
  assert.deepEqual(reply.headers['set-cookie'], ['better-auth-session=abc; Path=/; HttpOnly']);
  assert.equal(reply.statusCode, 200);
  assert.equal(reply.headers['content-type'], 'application/json');
  assert.equal(reply.headers['access-control-allow-origin'], 'http://localhost:8081');
  assert.equal(reply.headers['access-control-allow-credentials'], 'true');
  assert.deepEqual(JSON.parse(reply.payload.toString('utf8')), { ok: true });
});

test('proxyBetterAuthRequest maps legacy redirectUri payloads to Better Auth callback URLs', async () => {
  let observedBody = null;

  const fetchFn = async (_url, init) => {
    observedBody = JSON.parse(init.body);

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        entries() {
          return [['content-type', 'application/json']][Symbol.iterator]();
        },
        get() {
          return null;
        },
      },
      async arrayBuffer() {
        return Buffer.from(JSON.stringify({ ok: true }), 'utf8');
      },
    };
  };

  const request = {
    method: 'POST',
    raw: {
      url: '/auth/sign-in/social',
    },
    headers: {
      origin: 'http://localhost:8081',
      'content-type': 'application/json',
      host: 'localhost:8082',
    },
    body: {
      provider: 'google',
      redirectUri: 'https://testnet.airs.alternun.co/auth/callback',
    },
  };

  const reply = createReply();
  const handled = await proxyBetterAuthRequest(request, reply, 'http://127.0.0.1:8084', fetchFn);

  assert.equal(handled, true);
  assert.deepEqual(observedBody, {
    provider: 'google',
    redirectUri: 'https://testnet.airs.alternun.co/auth/callback',
    callbackURL: 'https://testnet.airs.alternun.co/auth/callback',
    errorCallbackURL: 'https://testnet.airs.alternun.co/auth/callback',
    newUserCallbackURL: 'https://testnet.airs.alternun.co/auth/callback',
  });
});

test('proxyBetterAuthRequest fills missing error and new-user callback URLs from callbackURL', async () => {
  let observedBody = null;

  const fetchFn = async (_url, init) => {
    observedBody = JSON.parse(init.body);

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        entries() {
          return [['content-type', 'application/json']][Symbol.iterator]();
        },
        get() {
          return null;
        },
      },
      async arrayBuffer() {
        return Buffer.from(JSON.stringify({ ok: true }), 'utf8');
      },
    };
  };

  const request = {
    method: 'POST',
    raw: {
      url: '/auth/sign-in/social',
    },
    headers: {
      origin: 'http://localhost:8081',
      'content-type': 'application/json',
      host: 'localhost:8082',
    },
    body: {
      provider: 'google',
      callbackURL: 'https://testnet.airs.alternun.co/auth/callback',
    },
  };

  const reply = createReply();
  const handled = await proxyBetterAuthRequest(request, reply, 'http://127.0.0.1:8084', fetchFn);

  assert.equal(handled, true);
  assert.deepEqual(observedBody, {
    provider: 'google',
    callbackURL: 'https://testnet.airs.alternun.co/auth/callback',
    errorCallbackURL: 'https://testnet.airs.alternun.co/auth/callback',
    newUserCallbackURL: 'https://testnet.airs.alternun.co/auth/callback',
  });
});

test('proxyBetterAuthRequest rewrites auth error redirects to the app callback route', async () => {
  const fetchFn = async () => ({
    ok: true,
    status: 302,
    statusText: 'Found',
    headers: {
      entries() {
        return [
          ['location', '/?error=state_mismatch'],
          ['content-type', 'application/octet-stream'],
        ][Symbol.iterator]();
      },
      getSetCookie() {
        return [];
      },
      get(name) {
        return name.toLowerCase() === 'location' ? '/?error=state_mismatch' : null;
      },
    },
    async arrayBuffer() {
      return Buffer.alloc(0);
    },
  });

  const request = {
    method: 'GET',
    raw: {
      url: '/auth/error?error=state_mismatch',
    },
    headers: {
      origin: 'https://testnet.airs.alternun.co',
      'content-type': 'application/json',
      host: 'testnet.api.alternun.co',
      'x-forwarded-host': 'testnet.api.alternun.co',
      'x-forwarded-proto': 'https',
    },
  };

  const reply = createReply();
  const handled = await proxyBetterAuthRequest(request, reply, 'https://testnet.api.alternun.co', fetchFn);

  assert.equal(handled, true);
  assert.equal(
    reply.headers.location,
    'https://testnet.airs.alternun.co/auth/callback?error=state_mismatch'
  );
});

test('proxyBetterAuthRequest answers OPTIONS preflight locally', async () => {
  let fetchCalled = false;

  const request = {
    method: 'OPTIONS',
    raw: {
      url: '/auth/sign-in/social',
    },
    headers: {
      origin: 'http://localhost:8081',
      host: 'localhost:8082',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
    body: undefined,
  };

  const reply = createReply();
  const handled = await proxyBetterAuthRequest(
    request,
    reply,
    'http://127.0.0.1:8084',
    async () => {
      fetchCalled = true;
      throw new Error('should not be called');
    }
  );

  assert.equal(handled, true);
  assert.equal(fetchCalled, false);
  assert.equal(reply.statusCode, 204);
  assert.equal(reply.headers['access-control-allow-origin'], 'http://localhost:8081');
  assert.equal(reply.headers['access-control-allow-credentials'], 'true');
  assert.equal(
    reply.headers['access-control-allow-methods'],
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  assert.equal(reply.headers['access-control-allow-headers'], 'content-type');
  assert.equal(reply.payload, undefined);
});
