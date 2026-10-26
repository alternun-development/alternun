require('reflect-metadata');

const assert = require('node:assert/strict');
const test = require('node:test');
const { Module, VersioningType } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');

const {
  BETTER_AUTH_ALLOWED_HEADERS,
  resolveBetterAuthTrustedOrigin,
} = require('../src/common/bootstrap/better-auth-cors.ts');
const {
  resolveBetterAuthDevConfig,
} = require('../src/modules/better-auth-dev/better-auth-dev.config.ts');

let app;

class AdminCorsPreflightTestModule {}

Module({})(AdminCorsPreflightTestModule);

// Mirrors the CORS setup in createApp() with the default trusted origins.
test.before(async () => {
  const { trustedOrigins } = resolveBetterAuthDevConfig({});
  app = await NestFactory.create(AdminCorsPreflightTestModule, new FastifyAdapter(), {
    logger: false,
  });
  app.enableVersioning({ type: VersioningType.URI });
  app.enableCors({
    origin: (origin, callback) => {
      callback(null, Boolean(resolveBetterAuthTrustedOrigin(origin, trustedOrigins)));
    },
    credentials: true,
    allowedHeaders: [...BETTER_AUTH_ALLOWED_HEADERS],
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

test.after(async () => {
  await app?.close();
});

function preflight(origin) {
  return app
    .getHttpAdapter()
    .getInstance()
    .inject({
      method: 'OPTIONS',
      url: '/v1/admin/projects',
      headers: {
        origin,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });
}

for (const origin of ['https://testnet.admin.alternun.co', 'https://admin.alternun.co']) {
  test(`admin preflight allows ${origin}`, async () => {
    const response = await preflight(origin);

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['access-control-allow-origin'], origin);
    assert.equal(response.headers['access-control-allow-credentials'], 'true');
    assert.match(response.headers['access-control-allow-methods'] ?? '', /GET/);
  });
}

for (const origin of [
  'https://untrusted.example',
  'https://testnet.admin.alternun.co.evil.com',
  'http://testnet.admin.alternun.co',
]) {
  test(`admin preflight rejects ${origin}`, async () => {
    const response = await preflight(origin);

    assert.equal(response.statusCode, 404);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    assert.equal(response.headers['access-control-allow-credentials'], undefined);
  });
}
