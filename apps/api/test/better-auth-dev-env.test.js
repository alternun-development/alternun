const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');

const {
  loadEnvFile,
  resolveBetterAuthDevConfig,
} = require('../scripts/better-auth-dev-env.cjs');

test('resolveBetterAuthDevConfig falls back to the local Better Auth defaults', () => {
  const config = resolveBetterAuthDevConfig({});

  assert.equal(config.port, 9083);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.baseURL, 'http://127.0.0.1:9083');
  assert.equal(config.trustedOrigins.includes('http://localhost:8081'), true);
  assert.equal(config.trustedOrigins.includes('http://127.0.0.1:8081'), true);
  assert.ok(config.secret.length >= 32);
});

test('resolveBetterAuthDevConfig accepts the legacy Better Auth secret alias', () => {
  const config = resolveBetterAuthDevConfig({
    GOOGLEA_AUTH_CLIENT_SECRET: 'example-legacy-secret',
  });

  assert.equal(config.googleClientSecret, 'example-legacy-secret');
});

test('resolveBetterAuthDevConfig falls back to the public Better Auth url and derives a stable secret', () => {
  const config = resolveBetterAuthDevConfig({
    AUTH_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
    AUTHENTIK_JWT_SIGNING_KEY: 'issuer-signing-key',
  });

  assert.equal(config.baseURL, 'https://testnet.api.alternun.co');
  assert.equal(config.secret.length >= 32, true);
  assert.equal(
    new Set(config.trustedOrigins).has('https://testnet.airs.alternun.co'),
    true
  );
});

test('resolveBetterAuthDevConfig falls back to the auth exchange url when the Better Auth url is missing', () => {
  const config = resolveBetterAuthDevConfig({
    AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
    AUTHENTIK_JWT_SIGNING_KEY: 'issuer-signing-key',
  });

  assert.equal(config.baseURL, 'https://testnet.api.alternun.co');
  assert.equal(config.secret.length >= 32, true);
  assert.equal(
    new Set(config.trustedOrigins).has('https://testnet.airs.alternun.co'),
    true
  );
});

test('resolveBetterAuthDevConfig parses Discord credentials when present', () => {
  const config = resolveBetterAuthDevConfig({
    DISCORD_AUTH_CLIENT_ID: 'example-discord-client',
    DISCORD_AUTH_CLIENT_SECRET: 'example-discord-secret',
  });

  assert.equal(config.discordClientId, 'example-discord-client');
  assert.equal(config.discordClientSecret, 'example-discord-secret');
});

test('resolveBetterAuthDevConfig parses optional OAuth proxy settings', () => {
  const config = resolveBetterAuthDevConfig({
    BETTER_AUTH_OAUTH_PROXY_CURRENT_URL: 'http://localhost:8081',
    BETTER_AUTH_OAUTH_PROXY_PRODUCTION_URL: 'http://localhost:9083',
    BETTER_AUTH_OAUTH_PROXY_SECRET: 'example-oauth-proxy-secret',
    BETTER_AUTH_OAUTH_PROXY_MAX_AGE: '45',
  });

  assert.equal(config.oauthProxy.enabled, true);
  assert.equal(config.oauthProxy.currentURL, 'http://localhost:8081');
  assert.equal(config.oauthProxy.productionURL, 'http://localhost:9083');
  assert.equal(config.oauthProxy.secret, 'example-oauth-proxy-secret');
  assert.equal(config.oauthProxy.maxAge, 45);
});

test('loadEnvFile parses a dedicated Better Auth env file', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'alternun-better-auth-env-'));
  const envPath = join(tempDir, '.env.better-auth');
  const originalEnv = { ...process.env };

  try {
    writeFileSync(
      envPath,
      [
        '# better auth dev env',
        'PORT=9099',
        'HOST=localhost',
        'BETTER_AUTH_URL=http://localhost:9099',
        'BETTER_AUTH_SECRET="example-dev-better-auth-secret"',
        'BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:8081, http://127.0.0.1:8081',
        'GOOGLE_AUTH_CLIENT_ID=example-google-client',
        'GOOGLE_AUTH_CLIENT_SECRET=example-google-secret',
        'DISCORD_AUTH_CLIENT_ID=example-discord-client',
        'DISCORD_AUTH_CLIENT_SECRET=example-discord-secret',
      ].join('\n')
    );

    loadEnvFile(envPath);
    const config = resolveBetterAuthDevConfig(process.env);

    assert.equal(config.port, 9099);
    assert.equal(config.host, 'localhost');
    assert.equal(config.baseURL, 'http://localhost:9099');
    assert.equal(config.secret, 'example-dev-better-auth-secret');
    assert.deepEqual(config.trustedOrigins, [
      'http://localhost:8081',
      'http://127.0.0.1:8081',
    ]);
    assert.equal(config.googleClientId, 'example-google-client');
    assert.equal(config.googleClientSecret, 'example-google-secret');
    assert.equal(config.discordClientId, 'example-discord-client');
    assert.equal(config.discordClientSecret, 'example-discord-secret');
  } finally {
    process.env = originalEnv;
  }
});
