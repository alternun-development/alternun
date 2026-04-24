const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createBetterAuthDevAuth,
} = require('../src/modules/better-auth-dev/better-auth-dev.server.ts');

test('createBetterAuthDevAuth includes oauth proxy when configured', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

    const auth = createBetterAuthDevAuth({
      port: 8082,
      host: '127.0.0.1',
      baseURL: 'http://127.0.0.1:8082',
      secret: 'example-better-auth-secret',
      trustedOrigins: ['http://localhost:8081'],
      googleClientId: 'example-google-client',
      googleClientSecret: 'example-google-secret',
      discordClientId: 'example-discord-client',
      discordClientSecret: 'example-discord-secret',
      oauthProxy: {
        enabled: true,
        currentURL: 'http://localhost:8081',
        productionURL: 'http://localhost:8084',
        secret: 'example-oauth-proxy-secret',
        maxAge: 45,
      },
    });

    assert.equal(
      auth.options.plugins.some((plugin) => plugin.id === 'oauth-proxy'),
      true
    );
    assert.equal(auth.options.emailAndPassword.requireEmailVerification, true);
    assert.equal(auth.options.emailAndPassword.autoSignIn, false);
    assert.equal(auth.options.emailVerification.sendOnSignUp, true);
    assert.equal(auth.options.emailVerification.sendOnSignIn, true);
    assert.equal(typeof auth.options.emailVerification.sendVerificationEmail, 'function');
    assert.equal(auth.options.advanced.database.generateId, 'uuid');
    assert.equal(auth.options.account.skipStateCookieCheck, true);
    assert.equal(auth.options.account.accountLinking.trustedProviders.includes('discord'), true);
    assert.equal(Boolean(auth.options.socialProviders.discord), true);
    assert.equal(auth.options.socialProviders.google.redirectURI, undefined);
    assert.equal(auth.options.socialProviders.discord.redirectURI, undefined);

    const hookResult = await auth.options.databaseHooks.user.create.before({
      email: 'edward@example.com',
      image: 'https://example.com/avatar.png',
    });
    assert.match(hookResult.data.id, /^[0-9a-f-]{36}$/);
    assert.equal(hookResult.data.sub, hookResult.data.id);
    assert.equal(hookResult.data.iss, 'better-auth');
    assert.equal(hookResult.data.aud, 'authenticated');
    assert.equal(hookResult.data.provider, 'better-auth');
    assert.equal(hookResult.data.picture, 'https://example.com/avatar.png');
  } finally {
    process.env = originalEnv;
  }
});

test('createBetterAuthDevAuth accepts backend database env fallback', () => {
  const originalEnv = { ...process.env };

  try {
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_DATABASE_URL;
    process.env.INFRA_BACKEND_API_DATABASE_URL =
      'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

    const auth = createBetterAuthDevAuth({
      port: 8082,
      host: '127.0.0.1',
      baseURL: 'http://127.0.0.1:8082',
      secret: 'example-better-auth-secret',
      trustedOrigins: ['http://localhost:8081'],
      googleClientId: 'example-google-client',
      googleClientSecret: 'example-google-secret',
      discordClientId: 'example-discord-client',
      discordClientSecret: 'example-discord-secret',
      oauthProxy: {
        enabled: false,
      },
    });

    assert.equal(
      auth.options.plugins.some((plugin) => plugin.id === 'oauth-proxy'),
      false
    );
    assert.equal(Boolean(auth.options.socialProviders.google), true);
    assert.equal(auth.options.emailAndPassword.requireEmailVerification, true);
    assert.equal(auth.options.emailVerification.sendOnSignUp, true);
    assert.equal(auth.options.emailAndPassword.autoSignIn, false);
    assert.equal(auth.options.emailVerification.sendOnSignIn, true);
    assert.equal(auth.options.advanced.database.generateId, 'uuid');
  } finally {
    process.env = originalEnv;
  }
});
