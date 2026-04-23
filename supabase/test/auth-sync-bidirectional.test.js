const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  'supabase',
  'migrations',
  '20260422_0013_auth_users_source_of_truth.sql'
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

  assert.match(source, /Auth users are the source of truth for signup/i);
  assert.match(source, /drop trigger if exists trg_public_users_sync_to_auth_users on public\.users;/);
  assert.match(source, /drop trigger if exists trg_public_users_fill_better_auth_identity on public\.users;/);
  assert.match(source, /drop trigger if exists trg_public_users_delete_sync_to_auth_users on public\.users;/);
  assert.match(source, /insert into public\.users \(/);
  assert.match(source, /not exists \(\s*select 1\s*from public\.users p\s*where p\.email = a\.email\s*\)/i);
});

void test('legacy public trigger cleanup files only drop reverse sync hooks', () => {
  const fillTriggerSource = fs.readFileSync(fillTriggerPath, 'utf8');
  const publicSyncSource = fs.readFileSync(publicSyncTriggerPath, 'utf8');
  const publicDeleteSource = fs.readFileSync(publicDeleteTriggerPath, 'utf8');

  const authSyncSource = fs.readFileSync(authSyncTriggerPath, 'utf8');

  assert.match(authSyncSource, /drop trigger if exists trg_auth_users_sync_to_app_users on auth\.users;/i);
  assert.match(authSyncSource, /drop trigger if exists trg_auth_users_create_profile on auth\.users;/i);
  assert.match(fillTriggerSource, /Legacy Better Auth public->auth identity fill disabled/i);
  assert.match(fillTriggerSource, /drop trigger if exists trg_public_users_fill_better_auth_identity on public\.users;/i);
  assert.doesNotMatch(fillTriggerSource, /create trigger trg_public_users_fill_better_auth_identity/i);
  assert.match(publicSyncSource, /Legacy reverse sync disabled/i);
  assert.match(publicSyncSource, /drop trigger if exists trg_public_users_sync_to_auth_users on public\.users;/i);
  assert.doesNotMatch(publicSyncSource, /create trigger trg_public_users_sync_to_auth_users/i);
  assert.match(publicDeleteSource, /Legacy reverse delete sync disabled/i);
  assert.match(publicDeleteSource, /drop trigger if exists trg_public_users_delete_sync_to_auth_users on public\.users;/i);
  assert.doesNotMatch(publicDeleteSource, /create trigger trg_public_users_delete_sync_to_auth_users/i);
});
