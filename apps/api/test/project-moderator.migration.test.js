const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../supabase/migrations/20261109_0003_project_moderator_membership.sql'
  ),
  'utf8'
);

test('memberships accept project_moderator and partner operators may grant and change it', () => {
  assert.match(
    migration,
    /role in \('partner_operator', 'sub_admin', 'partner_readonly', 'project_moderator'\)/
  );
  // grant: operators may grant the three delegated roles, never partner_operator
  assert.match(migration, /and p_role in \('sub_admin', 'partner_readonly', 'project_moderator'\)/);
  // change: both the current and the new role must be delegated roles
  assert.match(
    migration,
    /and v_before\.role in \('sub_admin', 'partner_readonly', 'project_moderator'\)\s+and p_new_role in \('sub_admin', 'partner_readonly', 'project_moderator'\)/
  );
  assert.doesNotMatch(migration, /p_role in \('partner_operator'/);
});

test('the RPCs stay security definer, pinned search_path and service_role only', () => {
  assert.equal((migration.match(/security definer/g) ?? []).length, 2);
  assert.equal((migration.match(/set search_path = pg_catalog, public/g) ?? []).length, 2);
  assert.match(migration, /from public, anon, authenticated;/);
  assert.match(migration, /to service_role;/);
});
