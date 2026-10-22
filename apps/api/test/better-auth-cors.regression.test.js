const assert = require('node:assert/strict');
const test = require('node:test');

const {
  handleBetterAuthRuntimeRequest,
} = require('../src/common/bootstrap/better-auth-runtime.ts');

const TRUSTED_ORIGINS = ['https://testnet.airs.alternun.co'];

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

test('handleBetterAuthRuntimeRequest does not expose credentialed CORS or rewritten redirects to an untrusted origin', async () => {
  const request = {
    method: 'GET',
    raw: {
      url: '/auth/error?error=state_mismatch',
    },
    headers: {
      origin: 'https://untrusted.example',
      cookie: 'better-auth-session=abc',
      'x-forwarded-host': 'testnet.api.alternun.co',
      'x-forwarded-proto': 'https',
    },
  };

  const reply = createReply();
  const handled = await handleBetterAuthRuntimeRequest(request, reply, {
    baseUrl: 'https://testnet.api.alternun.co',
    trustedOrigins: TRUSTED_ORIGINS,
    authHandler: async () =>
      new Response(null, {
        status: 302,
        headers: {
          location: '/?error=state_mismatch',
        },
      }),
  });

  assert.equal(handled, true);
  assert.deepEqual(
    {
      allowOrigin: reply.headers['access-control-allow-origin'],
      allowCredentials: reply.headers['access-control-allow-credentials'],
      location: reply.headers.location,
    },
    {
      allowOrigin: undefined,
      allowCredentials: undefined,
      location: '/?error=state_mismatch',
    }
  );
});

test('handleBetterAuthRuntimeRequest exposes credentialed CORS and rewrites redirects for a trusted origin', async () => {
  const request = {
    method: 'GET',
    raw: {
      url: '/auth/error?error=state_mismatch',
    },
    headers: {
      origin: 'https://testnet.airs.alternun.co',
      cookie: 'better-auth-session=abc',
      'x-forwarded-host': 'testnet.api.alternun.co',
      'x-forwarded-proto': 'https',
    },
  };

  const reply = createReply();
  const handled = await handleBetterAuthRuntimeRequest(request, reply, {
    baseUrl: 'https://testnet.api.alternun.co',
    trustedOrigins: TRUSTED_ORIGINS,
    authHandler: async () =>
      new Response(null, {
        status: 302,
        headers: {
          location: '/?error=state_mismatch',
        },
      }),
  });

  assert.equal(handled, true);
  assert.deepEqual(
    {
      allowOrigin: reply.headers['access-control-allow-origin'],
      allowCredentials: reply.headers['access-control-allow-credentials'],
      location: reply.headers.location,
    },
    {
      allowOrigin: 'https://testnet.airs.alternun.co',
      allowCredentials: 'true',
      location: 'https://testnet.airs.alternun.co/auth/callback?error=state_mismatch',
    }
  );
});

test('handleBetterAuthRuntimeRequest does not add CORS headers or rewrite redirects without Origin', async () => {
  const request = {
    method: 'GET',
    raw: {
      url: '/auth/error?error=state_mismatch',
    },
    headers: {
      'x-forwarded-host': 'testnet.api.alternun.co',
      'x-forwarded-proto': 'https',
    },
  };

  const reply = createReply();
  const handled = await handleBetterAuthRuntimeRequest(request, reply, {
    baseUrl: 'https://testnet.api.alternun.co',
    trustedOrigins: TRUSTED_ORIGINS,
    authHandler: async () =>
      new Response(null, {
        status: 302,
        headers: {
          location: '/?error=state_mismatch',
        },
      }),
  });

  assert.equal(handled, true);
  assert.deepEqual(
    {
      allowOrigin: reply.headers['access-control-allow-origin'],
      allowCredentials: reply.headers['access-control-allow-credentials'],
      location: reply.headers.location,
    },
    {
      allowOrigin: undefined,
      allowCredentials: undefined,
      location: '/?error=state_mismatch',
    }
  );
});
