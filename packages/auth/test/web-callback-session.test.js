import assert from 'node:assert/strict';
import test from 'node:test';
import {
  finalizeSupabaseCallbackSession,
  oidcSessionToUser,
  readWebAuthCallbackPayload,
  stripAuthCallbackTokensFromUrl,
} from '../dist/index.js';

test('finalizeSupabaseCallbackSession applies the legacy Supabase session payload', async () => {
  const calls = [];

  await finalizeSupabaseCallbackSession(
    {
      supabase: {
        auth: {
          setSession: async (payload) => {
            calls.push(payload);
            return { error: null };
          },
        },
      },
    },
    {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  });
});

test('finalizeSupabaseCallbackSession surfaces Supabase session errors', async () => {
  await assert.rejects(
    () =>
      finalizeSupabaseCallbackSession(
        {
          supabase: {
            auth: {
              setSession: async () => ({ error: { message: 'denied' } }),
            },
          },
        },
        {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }
      ),
    /denied/
  );
});

test('oidcSessionToUser normalizes OIDC session claims into an app user', () => {
  const user = oidcSessionToUser(
    {
      provider: 'google',
      claims: {
        sub: 'google-123',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        picture: 'https://example.com/avatar.png',
        email_verified: true,
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
      },
    },
    'app-user-123'
  );

  assert.equal(user.id, 'app-user-123');
  assert.equal(user.email, 'ada@example.com');
  assert.equal(user.provider, 'google');
  assert.equal(user.metadata.emailVerified, true);
});

test('readWebAuthCallbackPayload merges hash and query callback parameters', () => {
  const payload = readWebAuthCallbackPayload(
    '?next=%2Fdashboard&code=abc123',
    '#access_token=token-1&refresh_token=token-2&type=callback'
  );

  assert.equal(payload.accessToken, 'token-1');
  assert.equal(payload.refreshToken, 'token-2');
  assert.equal(payload.callbackType, 'callback');
  assert.equal(payload.hasPayload, true);
});

test('stripAuthCallbackTokensFromUrl removes callback tokens from the address bar', () => {
  const replaceCalls = [];

  stripAuthCallbackTokensFromUrl(
    'https://example.com/auth/callback?next=%2Fdashboard&code=abc123&access_token=token-1',
    {
      history: {
        replaceState: (_state, _title, url) => {
          replaceCalls.push(String(url));
        },
      },
    }
  );

  assert.equal(replaceCalls.length, 1);
  assert.equal(replaceCalls[0], '/auth/callback?next=%2Fdashboard');
});
