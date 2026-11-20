const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../supabase/migrations/20261110_0001_create_enterprise_applications.sql'
  ),
  'utf8'
);

test('enterprise applications are private, rate limited and never store raw IPs', () => {
  assert.match(
    migration,
    /revoke all on table public\.enterprise_applications from public, anon, authenticated/
  );
  assert.match(
    migration,
    /grant execute on function public\.marketplace_submit_enterprise_application\(jsonb, text\)\s+to service_role/
  );
  assert.match(migration, /ip_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(migration, /v_ip_count >= 5 or v_email_count >= 3/);
  assert.match(migration, /security definer\s+set search_path = pg_catalog, public/);
});

test('invalid rows become a clean INPUT_INVALID answer instead of a database error', () => {
  assert.match(migration, /when check_violation or not_null_violation then/);
  assert.match(migration, /company_size in \('1-10', '11-50', '51-200', '201\+'\)/);
});
