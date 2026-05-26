const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  'supabase',
  'migrations',
  '20260424_0002_better_auth_user_identity_defaults.sql'
);

void test('better auth user identity migration heals uuid drift and preserves provider defaults', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');

  assert.match(source, /DROP TRIGGER IF EXISTS trg_public_users_fill_better_auth_identity ON public\.users;/i);
  assert.match(source, /ALTER COLUMN sub TYPE text USING sub::text/i);
  assert.match(source, /ADD COLUMN IF NOT EXISTS provider text/i);
  assert.match(source, /ALTER COLUMN provider SET DEFAULT 'better-auth'/i);
  assert.match(
    source,
    /NEW\.provider := COALESCE\(NULLIF\(btrim\(NEW\.provider\), ''\), 'better-auth'\);/i
  );
  assert.match(
    source,
    /BEFORE INSERT OR UPDATE OF id, sub, iss, aud, provider, image, picture/i
  );
});
