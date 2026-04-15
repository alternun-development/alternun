import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlternunAuthentikPreset } from '../dist/index.js';

test('createAlternunAuthentikPreset accepts an explicit provisioning adapter', async () => {
  const calls = [];

  const preset = createAlternunAuthentikPreset({
    issuer: 'https://sso.example.com/application/o/alternun-mobile/',
    clientId: 'alternun-mobile',
    redirectUri: 'myapp://auth/callback',
    provisioningAdapter: {
      sync: async (payload) => {
        calls.push(payload);
        return {
          synced: true,
          appUserId: 'app-user-42',
        };
      },
    },
  });

  const userId = await preset.onSessionReady(
    {
      sub: 'google-123',
      iss: 'https://accounts.google.com',
      email: 'ada@example.com',
      email_verified: true,
      name: 'Ada Lovelace',
      picture: 'https://example.com/avatar.png',
    },
    'google'
  );

  assert.equal(userId, 'app-user-42');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].provider, 'google');
  assert.equal(calls[0].email, 'ada@example.com');
  assert.equal(calls[0].sub, 'google-123');
});
