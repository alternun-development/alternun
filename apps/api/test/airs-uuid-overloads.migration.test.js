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
