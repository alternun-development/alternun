import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const migrationPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260817_0001_drop_remaining_airs_uuid_overloads.sql'
);

void test('the AIRS overload repair migration removes every legacy UUID RPC overload', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');

  for (const signature of [
    'airs_award_profile_completion_bonus(uuid, numeric, text, jsonb)',
    'airs_mark_welcome_email_sent(uuid, text, jsonb)',
    'airs_record_dashboard_visit(uuid, text, jsonb)',
    'airs_get_dashboard_snapshot(uuid, text, integer)',
  ]) {
    assert.ok(source.includes(`drop function if exists public.${signature}`));
  }
});

void test('the AIRS overload repair reloads the PostgREST schema cache', () => {
  const migrationPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../supabase/migrations/20260818_0001_reload_postgrest_schema_after_airs_rpc_cleanup.sql'
  );

  const source = fs.readFileSync(migrationPath, 'utf8');
  assert.match(source, /notify\s+pgrst\s*,\s*'reload schema'/i);
});

void test('the production snapshot RPC has one UUID signature', () => {
  const migrationPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../supabase/migrations/20260818_0002_make_airs_snapshot_rpc_uuid_canonical.sql'
  );

  const source = fs.readFileSync(migrationPath, 'utf8');
  assert.match(source, /drop function if exists public\.airs_get_dashboard_snapshot\(text, text, integer\)/i);
  assert.match(source, /create function public\.airs_get_dashboard_snapshot\(\s*p_user_id uuid,/i);
  assert.match(source, /grant execute on function public\.airs_get_dashboard_snapshot\(uuid, text, integer\)/i);
});

void test('the snapshot RPC comparison is safe for UUID and text user schemas', () => {
  const migrationPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../supabase/migrations/20260818_0004_make_airs_snapshot_user_id_comparison_stage_safe.sql'
  );

  const source = fs.readFileSync(migrationPath, 'utf8');
  assert.match(source, /where id::text = p_user_id::text;/i);
});
