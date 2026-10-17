const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  __dirname,
  '../../../supabase/migrations/20261017_0001_harden_security_definer_functions.sql'
);

test('security hardening revokes public execution from every SECURITY DEFINER function', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');

  assert.match(source, /alter default privileges for role postgres/i);
  assert.match(source, /managed supabase_admin role is not a member/i);
  assert.match(source, /revoke execute on function %s from public, anon, authenticated/i);
  assert.match(source, /grant execute on function %s to service_role/i);
  assert.match(source, /has_function_privilege\('anon', procedure\.oid, 'EXECUTE'\)/i);
  assert.match(source, /has_function_privilege\('authenticated', procedure\.oid, 'EXECUTE'\)/i);
});

test('AIRS RPC configuration does not fall back to a public Supabase key', () => {
  const { resolveAirsSupabaseConfig } = require('../src/modules/airs/airs.repository.ts');

  assert.equal(
    resolveAirsSupabaseConfig({
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_ANON_KEY: 'anon-key',
      EXPO_PUBLIC_SUPABASE_KEY: 'public-key',
    }),
    null
  );

  assert.deepEqual(
    resolveAirsSupabaseConfig({
      SUPABASE_URL: 'https://supabase.example/',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    }),
    { url: 'https://supabase.example/', key: 'service-role-key' }
  );
});
