const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  '../../supabase/migrations/20261019_0001_create_project_proposals.sql'
);
const sqlTestPath = path.resolve('../../supabase/test/project_proposals_security_verification.sql');

test('project proposal migration keeps clients outside the data plane', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /alter table public\.project_proposals enable row level security/i);
  assert.match(
    migration,
    /revoke all on table public\.project_proposals from public, anon, authenticated/i
  );
  assert.match(migration, /set search_path = pg_catalog, public/i);
  assert.match(
    migration,
    /grant execute on function public\.marketplace_submit_project_proposal[\s\S]*to service_role/i
  );
  assert.match(migration, /v_ip_count >= 5/);
  assert.match(migration, /v_email_count >= 3/);
  assert.doesNotMatch(migration, /create policy/i);
});

test('project proposal SQL verification covers insert, invalid input, and anon denial', () => {
  const sql = fs.readFileSync(sqlTestPath, 'utf8');
  assert.match(sql, /valid proposal was not stored/i);
  assert.match(sql, /PROJECT_PROPOSAL_INPUT_INVALID/);
  assert.match(sql, /set local role anon/i);
  assert.match(sql, /when insufficient_privilege then null/i);
});
