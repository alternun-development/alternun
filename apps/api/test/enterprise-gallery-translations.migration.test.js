const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../supabase/migrations/20261120_0002_enterprise_gallery_translations.sql'
  ),
  'utf8'
);

test('gallery and translations migration is schema only', () => {
  assert.doesNotMatch(migration, /insert into|update public\./i);
  assert.doesNotMatch(migration, /swing|golf/i);
});

test('the gallery is a short array and translations are objects', () => {
  assert.match(migration, /add column if not exists gallery jsonb not null default '\[\]'::jsonb/);
  assert.match(migration, /jsonb_array_length\(gallery\) <= 12/);
  // One translations column on enterprises and one on enterprise_products.
  assert.equal(
    migration.match(/add column if not exists translations jsonb not null default '\{\}'::jsonb/g)
      ?.length,
    2
  );
  assert.match(migration, /alter table public\.enterprise_products\s+add column if not exists/);
  assert.equal(migration.match(/jsonb_typeof\(translations\) = 'object'/g)?.length, 2);
});
