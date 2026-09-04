const assert = require('node:assert/strict');
const test = require('node:test');
const { ServiceUnavailableException, UnauthorizedException } = require('@nestjs/common');

const { AuthentikController } = require('../src/modules/authentik/authentik.controller.ts');
const {
  resolveSupabaseOidcSyncConfig,
  upsertOidcUserViaSupabase,
} = require('../src/modules/authentik/supabase-sync.ts');

test('Authentik webhook fails closed when the shared secret is not configured', async () => {
  const originalEnv = { ...process.env };
  delete process.env.AUTHENTIK_WEBHOOK_SECRET;

  const controller = new AuthentikController({
    handleWebhookEvent: async () => {
      throw new Error('should not be called');
    },
  });

  await assert.rejects(
    controller.webhook('anything', {
      action: 'model_updated',
      model: 'authentik_core.user',
      body: { uuid: 'user-1' },
    }),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.getStatus() === 503 &&
      String(error.message).includes('AUTHENTIK_WEBHOOK_SECRET')
  );

  process.env = originalEnv;
});

test('Authentik webhook rejects invalid secrets without calling the sync service', async () => {
  const originalEnv = { ...process.env };
  process.env.AUTHENTIK_WEBHOOK_SECRET = 'REDACTED_TEST_WEBHOOK_SECRET';
  let callCount = 0;

  const controller = new AuthentikController({
    handleWebhookEvent: async () => {
      callCount += 1;
    },
  });

  await assert.rejects(
    controller.webhook('short', {
      action: 'model_updated',
      model: 'authentik_core.user',
      body: { uuid: 'user-1' },
    }),
    (error) =>
      error instanceof UnauthorizedException &&
      error.getStatus() === 401 &&
      String(error.message).includes('Invalid webhook secret')
  );

  assert.equal(callCount, 0);
  process.env = originalEnv;
});

test('Authentik webhook accepts matching secrets and delegates exactly once', async () => {
  const originalEnv = { ...process.env };
  process.env.AUTHENTIK_WEBHOOK_SECRET = 'REDACTED_TEST_WEBHOOK_SECRET';
  let receivedPayload = null;

  const controller = new AuthentikController({
    handleWebhookEvent: async (payload) => {
      receivedPayload = payload;
    },
  });

  const payload = {
    action: 'model_updated',
    model: 'authentik_core.user',
    body: { uuid: 'user-1', email: 'user@example.com' },
  };

  await assert.deepEqual(await controller.webhook('REDACTED_TEST_WEBHOOK_SECRET', payload), {
    ok: true,
  });
  assert.deepEqual(receivedPayload, payload);
  process.env = originalEnv;
});

test('Supabase OIDC sync requires a service-role key and ignores public browser keys', () => {
  assert.equal(
    resolveSupabaseOidcSyncConfig({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      EXPO_PUBLIC_SUPABASE_KEY: 'public-key',
    }),
    null
  );

  assert.deepEqual(
    resolveSupabaseOidcSyncConfig({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      SUPABASE_ANON_KEY: 'anon-key',
    }),
    {
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'service-role-key',
    }
  );
});

test('Supabase OIDC sync uses the service-role key for the RPC call', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      json: async () => [{ id: 'app-user-1' }],
    };
  };

  try {
    const result = await upsertOidcUserViaSupabase(
      {
        sub: 'authentik:user-1',
        iss: 'https://login.alternun.co/application/o/alternun-admin/',
        email: 'user@example.com',
        emailVerified: true,
        name: 'User Example',
      },
      {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        SUPABASE_ANON_KEY: 'anon-key',
      }
    );

    assert.equal(result.skipped, false);
    assert.equal(result.appUserId, 'app-user-1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/rpc/upsert_oidc_user');
    assert.equal(calls[0].init.headers.apikey, 'service-role-key');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer service-role-key');
  } finally {
    global.fetch = originalFetch;
  }
});
