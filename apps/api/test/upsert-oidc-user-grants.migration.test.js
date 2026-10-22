const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationDirectory = path.resolve(__dirname, '../../../supabase/migrations');
const functionSignature = 'public.upsert_oidc_user(text, text, text, boolean, text, text, text, jsonb)';

test('OIDC upsert helper is unavailable to Supabase client roles', () => {
  const remediationMigration = fs.readFileSync(
    path.join(migrationDirectory, '20261009_0001_revoke_upsert_oidc_user_execute.sql'),
    'utf8'
  ).toLowerCase();

  assert.match(remediationMigration, /to_regprocedure\(/);

  for (const role of ['public', 'anon', 'authenticated']) {
    assert.ok(
      remediationMigration.includes(`revoke all on function %s from ${role}`),
      `expected EXECUTE to be revoked from ${role}`
    );
  }

  assert.ok(
    remediationMigration.includes('grant execute on function %s to service_role'),
    'expected backend service_role access to remain available'
  );
  assert.ok(remediationMigration.includes(functionSignature));
});
