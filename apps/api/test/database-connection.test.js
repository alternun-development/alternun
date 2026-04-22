const assert = require('node:assert/strict');
const test = require('node:test');

const {
  resolveDatabaseUrl,
} = require('../src/common/database/connection.ts');

test('resolveDatabaseUrl prefers the dedicated backend database on testnet-aligned stages', () => {
  const originalEnv = { ...process.env };

  try {
    const env = {
      ALTERNUN_TESTNET_MODE: 'on',
      INFRA_BACKEND_API_DATABASE_URL: 'postgresql://backend:backend@127.0.0.1:5432/backend',
      DATABASE_URL: 'postgresql://prod:prod@127.0.0.1:5432/prod',
      SUPABASE_DATABASE_URL: 'postgresql://supabase:supabase@127.0.0.1:5432/supabase',
    };

    assert.equal(resolveDatabaseUrl(env), env.INFRA_BACKEND_API_DATABASE_URL);
  } finally {
    process.env = originalEnv;
  }
});

test('resolveDatabaseUrl falls back to the shared database outside testnet stages', () => {
  const env = {
    INFRA_BACKEND_API_DATABASE_URL: '',
    DATABASE_URL: 'postgresql://shared:shared@127.0.0.1:5432/shared',
    SUPABASE_DATABASE_URL: 'postgresql://supabase:supabase@127.0.0.1:5432/supabase',
  };

  assert.equal(resolveDatabaseUrl(env), env.DATABASE_URL);
});
