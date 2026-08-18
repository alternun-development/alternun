import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const migrationPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260818_0006_repair_text_profile_bonus_after_uuid_overload_cleanup.sql'
);

void test('the text profile-bonus RPC remains self-contained after UUID overload cleanup', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');

  assert.match(source, /create or replace function public\.airs_award_profile_completion_bonus\(\s*p_user_id text/i);
  assert.match(source, /v_entry := public\.airs_record_ledger_entry\(/);
  assert.doesNotMatch(source, /from public\.airs_award_profile_completion_bonus\(\s*p_user_id::uuid/i);
});
