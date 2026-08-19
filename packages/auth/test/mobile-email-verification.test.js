import assert from 'node:assert/strict';
import test from 'node:test';
import { AlternunMobileAuthClient } from '../dist/mobile/AlternunMobileAuthClient.js';

test('email verification emits the user returned by the established Supabase session', async () => {
  const client = new AlternunMobileAuthClient({});
  const emittedUsers = [];
  const rawSupabaseUser = {
    id: 'user-123',
    email: 'ada@example.com',
    user_metadata: {
      avatar_url: 'https://example.com/ada.png',
      provider_id: 'metadata-provider-123',
      locale: 'en',
    },
    app_metadata: {
      provider: 'google',
      provider_id: 'google-123',
    },
  };

  client.listeners.add((user) => emittedUsers.push(user));
  client.supabase = {
    auth: {
      setSession: async () => ({
        data: { session: { user: rawSupabaseUser } },
        error: null,
      }),
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      user: {
        id: 'user-123',
        email: 'ada@example.com',
        image: 'https://example.com/ada.png',
        appMetadata: { provider: 'google', provider_id: 'google-123' },
      },
      session: { token: 'access-token', refreshToken: 'refresh-token' },
    }),
  });

  try {
    await client.verifyEmailConfirmationCode('Ada@Example.com', '123456');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(emittedUsers, [
    {
      id: 'user-123',
      email: 'ada@example.com',
      avatarUrl: 'https://example.com/ada.png',
      provider: 'google',
      providerUserId: 'google-123',
      metadata: {
        avatar_url: 'https://example.com/ada.png',
        provider_id: 'metadata-provider-123',
        locale: 'en',
      },
    },
  ]);
});
