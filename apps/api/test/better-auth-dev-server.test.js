const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createBetterAuthDevAuth,
} = require('../src/modules/better-auth-dev/better-auth-dev.server.ts');

test('createBetterAuthDevAuth includes oauth proxy when configured', () => {
  const auth = createBetterAuthDevAuth({
    port: 9083,
    host: '127.0.0.1',
    baseURL: 'http://127.0.0.1:9083',
    secret: 'example-better-auth-secret',
    trustedOrigins: ['http://localhost:8081'],
    googleClientId: 'example-google-client',
    googleClientSecret: 'example-google-secret',
    discordClientId: 'example-discord-client',
    discordClientSecret: 'example-discord-secret',
    oauthProxy: {
      enabled: true,
      currentURL: 'http://localhost:8081',
      productionURL: 'http://localhost:9083',
      secret: 'example-oauth-proxy-secret',
      maxAge: 45,
    },
  });

  assert.equal(auth.options.plugins.some((plugin) => plugin.id === 'oauth-proxy'), true);
  assert.equal(auth.options.account.skipStateCookieCheck, true);
  assert.equal(auth.options.account.accountLinking.trustedProviders.includes('discord'), true);
  assert.equal(Boolean(auth.options.socialProviders.discord), true);
});
