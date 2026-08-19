const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationDirectory = path.resolve(__dirname, '../../../supabase/migrations');
const functionSignature = 'public.create_user_notification(text, text, text, jsonb, text)';

test('notification helper execution is unavailable to Supabase client roles', () => {
  const initialMigration = fs.readFileSync(
    path.join(migrationDirectory, '20260819_0001_create_user_notifications.sql'),
    'utf8'
  );
  const remediationMigration = fs.readFileSync(
    path.join(migrationDirectory, '20260819_0003_revoke_user_notification_function_execute.sql'),
    'utf8'
  );

  for (const sql of [initialMigration, remediationMigration]) {
    for (const role of ['public', 'anon', 'authenticated']) {
      assert.ok(
        sql.toLowerCase().includes(`revoke all on function ${functionSignature} from ${role};`)
      );
    }
  }
});
