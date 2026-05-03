const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  'supabase',
  'migrations',
  '20260422_0013_auth_users_source_of_truth.sql'
);
const referralMigrationPath = path.resolve(
  'supabase',
  'migrations',
  '20260503_0001_auth_referral_attribution.sql'
);
const referralSlugFallbackMigrationPath = path.resolve(
  'supabase',
  'migrations',
  '20260503_0002_referral_slug_fallback_attribution.sql'
);
const authSyncFunctionPath = path.resolve(
  'supabase',
  'functions',
  'sync_auth_user_to_app_users.sql'
);
const fillTriggerPath = path.resolve(
  'supabase',
  'triggers',
  'public_users_fill_better_auth_identity.sql'
);
const authSyncTriggerPath = path.resolve('supabase', 'triggers', 'auth_users_sync.sql');
const publicSyncTriggerPath = path.resolve('supabase', 'triggers', 'public_users_sync.sql');
const publicDeleteTriggerPath = path.resolve('supabase', 'triggers', 'public_users_delete.sql');

void test('auth source-of-truth migration keeps the one-way auth mirror', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');
  const authSyncFunctionSource = fs.readFileSync(authSyncFunctionPath, 'utf8');
  const referralMigrationSource = fs.readFileSync(referralMigrationPath, 'utf8');
  const referralSlugFallbackMigrationSource = fs.readFileSync(
    referralSlugFallbackMigrationPath,
    'utf8'
  );

  assert.match(source, /Auth users are the source of truth for signup/i);
  assert.match(
    source,
    /drop trigger if exists trg_public_users_sync_to_auth_users on public\.users;/
  );
  assert.match(
    source,
    /drop trigger if exists trg_public_users_fill_better_auth_identity on public\.users;/
  );
  assert.match(
    source,
    /drop trigger if exists trg_public_users_delete_sync_to_auth_users on public\.users;/
  );
  assert.match(source, /insert into public\.users \(/);
  assert.match(
    source,
    /not exists \(\s*select 1\s*from public\.users p\s*where p\.email = a\.email\s*\)/i
  );
  assert.match(authSyncFunctionSource, /insert into public\.referrals \(/i);
  assert.match(authSyncFunctionSource, /email_confirmed_at is null/i);
  assert.match(authSyncFunctionSource, /referred_by_user_id/i);
  assert.match(authSyncFunctionSource, /referral_link\s*=\s*excluded\.referral_link/i);
  assert.match(authSyncFunctionSource, /https:\/\/airs\.alternun\.co\/auth\?referralCode=/i);
  assert.match(authSyncFunctionSource, /resolve_referrer_from_referral_input/i);
  assert.match(referralMigrationSource, /backfilled immediately so the DB heals on deploy/i);
  assert.match(referralMigrationSource, /insert into public\.referrals \(/i);
  assert.match(referralMigrationSource, /https:\/\/airs\.alternun\.co\/auth\?referralCode=/i);
  assert.match(referralSlugFallbackMigrationSource, /resolve_referrer_from_referral_input/i);
  assert.match(referralSlugFallbackMigrationSource, /regexp_replace/i);
  assert.match(
    referralSlugFallbackMigrationSource,
    /join lateral public\.resolve_referrer_from_referral_input/i
  );
});

void test('legacy public trigger cleanup files only drop reverse sync hooks', () => {
  const fillTriggerSource = fs.readFileSync(fillTriggerPath, 'utf8');
  const publicSyncSource = fs.readFileSync(publicSyncTriggerPath, 'utf8');
  const publicDeleteSource = fs.readFileSync(publicDeleteTriggerPath, 'utf8');

  const authSyncSource = fs.readFileSync(authSyncTriggerPath, 'utf8');

  assert.match(
    authSyncSource,
    /drop trigger if exists trg_auth_users_sync_to_app_users on auth\.users;/i
  );
  assert.match(
    authSyncSource,
    /drop trigger if exists trg_auth_users_create_profile on auth\.users;/i
  );
  assert.match(fillTriggerSource, /Legacy Better Auth public->auth identity fill disabled/i);
  assert.match(
    fillTriggerSource,
    /drop trigger if exists trg_public_users_fill_better_auth_identity on public\.users;/i
  );
  assert.doesNotMatch(
    fillTriggerSource,
    /create trigger trg_public_users_fill_better_auth_identity/i
  );
  assert.match(publicSyncSource, /Legacy reverse sync disabled/i);
  assert.match(
    publicSyncSource,
    /drop trigger if exists trg_public_users_sync_to_auth_users on public\.users;/i
  );
  assert.doesNotMatch(publicSyncSource, /create trigger trg_public_users_sync_to_auth_users/i);
  assert.match(publicDeleteSource, /Legacy reverse delete sync disabled/i);
  assert.match(
    publicDeleteSource,
    /drop trigger if exists trg_public_users_delete_sync_to_auth_users on public\.users;/i
  );
  assert.doesNotMatch(
    publicDeleteSource,
    /create trigger trg_public_users_delete_sync_to_auth_users/i
  );
});
