const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../../..');
const migration = fs.readFileSync(
  path.join(repoRoot, 'supabase/migrations/20261030_0002_archive_hotel_piloto_placeholder.sql'),
  'utf8'
);
const sql = migration.replace(/--.*$/gm, '');

test('the pilot ownership fix deletes nothing and changes no ownership', () => {
  assert.doesNotMatch(sql, /\bdelete\b|\btruncate\b|\bdrop\b/i);
  assert.doesNotMatch(sql, /\b(insert into|update)\s+public\.enterprise_projects\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.enterprises\b/i);
});

test('Hotel Piloto is archived only through the audited status function', () => {
  assert.match(sql, /public\.marketplace_set_enterprise_status\(\s*v_enterprise\.id,\s*'archived'/);
  assert.match(sql, /enterprise\.id = '24900000-0000-4000-8000-000000000001'/);
  assert.match(sql, /enterprise\.created_by_subject = 'issue-249-seed'/);
  assert.match(sql, /v_enterprise\.status = 'archived' then\s+return;/);
  assert.match(sql, /relation\.is_primary/);
});
