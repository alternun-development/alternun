const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../supabase/migrations/20261109_0001_enterprise_project_profiles.sql'
  ),
  'utf8'
);

test('profile migration is schema only: no partner data reaches production', () => {
  assert.doesNotMatch(migration, /insert into public\.(enterprises|projects|enterprise_products)/i);
  assert.doesNotMatch(migration, /batis|taybo|rotoingenieria|tapegua|gaira|matilde/i);
});

test('enterprise products are private to the API and keep a valid Airs range', () => {
  assert.match(migration, /alter table public\.enterprise_products enable row level security/);
  assert.match(
    migration,
    /revoke all on table public\.enterprise_products from public, anon, authenticated/
  );
  assert.match(migration, /airs_max >= airs_min/);
});

test('the media bucket is public, capped at 5 MB and only takes raster images', () => {
  const bucket = migration.match(/insert into storage\.buckets[\s\S]+?;/)?.[0] ?? '';
  assert.match(bucket, /'marketplace-media'/);
  assert.match(bucket, /true/);
  assert.match(bucket, /5242880/);
  assert.match(bucket, /'image\/jpeg', 'image\/png', 'image\/webp'/);
  assert.doesNotMatch(bucket, /svg/);
  assert.match(bucket, /on conflict \(id\) do nothing/);
});

test('team-only columns are documented as never public', () => {
  for (const table of ['enterprises', 'projects'])
    for (const column of ['internal_contacts', 'pending_items', 'internal_notes'])
      assert.match(
        migration,
        new RegExp(`comment on column public\\.${table}\\.${column} is 'Admin only`)
      );
});
