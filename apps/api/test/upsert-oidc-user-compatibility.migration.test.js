const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  __dirname,
  '../../../supabase/migrations/20261009_0002_preserve_oidc_user_identity_on_exchange.sql'
);

test('OIDC exchange compatibility adopts the legacy row before creating a new identity', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8').toLowerCase();

  assert.match(migration, /create or replace function public\.upsert_oidc_user_compat/);
  assert.match(migration, /p_legacy_sub\s+text/);
  assert.match(migration, /p_legacy_iss\s+text/);
  assert.match(migration, /where sub = p_legacy_sub/);
  assert.match(migration, /and iss = p_legacy_iss/);
  assert.match(migration, /set sub\s*= p_sub/);
  assert.match(migration, /set .*iss\s*= p_iss/s);
  assert.match(migration, /grant execute on function public\.upsert_oidc_user_compat/);
  assert.match(migration, /to service_role/);
});
