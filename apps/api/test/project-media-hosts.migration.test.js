const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '../../..');
const migrationPath = path.join(
  repoRoot,
  'supabase/migrations/20261026_0001_seed_project_image_media_hosts.sql'
);
const sqlTestPath = path.join(repoRoot, 'supabase/test/project_media_hosts_verification.sql');
const seedScriptPath = path.join(repoRoot, 'apps/api/scripts/seed-project-media-hosts.mjs');

async function loadSeedScript() {
  return import(pathToFileURL(seedScriptPath).href);
}

test('image media host migration seeds exact hosts for every image kind and is repeatable', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  for (const kind of ['logo', 'cover', 'gallery_image']) {
    assert.match(migration, new RegExp(`\\('${kind}', 'images\\.unsplash\\.com'\\)`));
  }
  assert.match(migration, /on conflict \(media_kind, host\) do nothing/i);
  assert.doesNotMatch(migration, /\*|:\d+|https?:\/\//);
});

test('image media host SQL verification covers allowed, rejected and client-denied cases', () => {
  const sql = fs.readFileSync(sqlTestPath, 'utf8');
  assert.match(sql, /images\.unsplash\.com\.evil\.com/);
  assert.match(sql, /'http:\/\/images\.unsplash\.com\/a\.png', 'MEDIA_URL_INVALID'/);
  assert.match(sql, /'https:\/\/user@images\.unsplash\.com\/a\.png', 'MEDIA_URL_INVALID'/);
  assert.match(sql, /'https:\/\/images\.unsplash\.com:8443\/a\.png', 'MEDIA_URL_INVALID'/);
  assert.match(sql, /set local role anon/i);
  assert.match(sql, /set local role authenticated/i);
  assert.match(sql, /when insufficient_privilege then null/i);
  assert.match(sql, /rollback;\s*$/);
});

test('parseImageHosts accepts exact hostnames and removes duplicates', async () => {
  const { parseImageHosts } = await loadSeedScript();
  assert.deepEqual(parseImageHosts(undefined), []);
  assert.deepEqual(parseImageHosts(' , '), []);
  assert.deepEqual(
    parseImageHosts('stage-storage.example.co, images.example.com,stage-storage.example.co'),
    ['stage-storage.example.co', 'images.example.com']
  );
});

test('parseImageHosts rejects schemes, ports, paths, wildcards and malformed hosts', async () => {
  const { parseImageHosts } = await loadSeedScript();
  for (const value of [
    'https://images.example.com',
    'images.example.com:443',
    'images.example.com/path',
    '*.example.com',
    'Images.Example.com',
    'user@images.example.com',
    'localhost',
    'images..example.com',
    '-images.example.com',
  ]) {
    assert.throws(() => parseImageHosts(value), /Invalid project media host/, value);
  }
});
