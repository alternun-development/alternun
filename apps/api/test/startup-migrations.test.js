const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');
const { Pool } = require('pg');
const { initMigrations } = require('../scripts/run-migrations-lambda.ts');

function setup(t) {
  const env = { ...process.env };
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), 'startup-migrations-'));
  mkdirSync(join(root, 'apps/api'), { recursive: true });
  process.env.MIGRATION_DATABASE_URL = 'postgresql://test:test@localhost/test';
  process.env.RUN_MIGRATIONS = 'true';
  process.chdir(join(root, 'apps/api'));
  t.after(() => {
    process.chdir(cwd);
    process.env = env;
    rmSync(root, { recursive: true, force: true });
  });
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  return root;
}

test('startup applies root migrations when launched from apps/api and releases the pool', async (t) => {
  const root = setup(t);
  mkdirSync(join(root, 'supabase/migrations'), { recursive: true });
  writeFileSync(join(root, 'supabase/migrations/20260919_0001_example.sql'), 'SELECT 42;');
  const queries = [];
  const client = {
    query: async (sql, parameters) => {
      queries.push([sql, parameters]);
      return { rows: sql.includes('SELECT EXISTS') ? [{ exists: true }] : [] };
    },
    release: t.mock.fn(),
  };
  t.mock.method(Pool.prototype, 'connect', async () => client);
  const end = t.mock.method(Pool.prototype, 'end', async () => {});

  await initMigrations();

  assert.ok(queries.some(([sql]) => sql === 'SELECT 42;'));
  assert.deepEqual(queries.at(-1)[1], ['example', '20260919_0001']);
  assert.equal(client.release.mock.callCount(), 1);
  assert.equal(end.mock.callCount(), 1);
});

test('startup fails instead of silently succeeding when migration files are missing', async (t) => {
  setup(t);
  const client = {
    query: async () => ({ rows: [{ exists: true }] }),
    release: t.mock.fn(),
  };
  t.mock.method(Pool.prototype, 'connect', async () => client);
  const end = t.mock.method(Pool.prototype, 'end', async () => {});

  await assert.rejects(initMigrations(), /Migration files not found/);
  assert.equal(client.release.mock.callCount(), 1);
  assert.equal(end.mock.callCount(), 1);
});

for (const message of [
  '(ENOTFOUND) tenant/user postgres.private-project not found',
  'Tenant or user not found',
]) {
  test(`startup explains a pooler tenant failure without leaking the tenant: ${
    message.split(' ')[0]
  }`, async (t) => {
    setup(t);
    t.mock.method(Pool.prototype, 'connect', async () => {
      throw Object.assign(new Error(message), { code: 'XX000' });
    });
    const end = t.mock.method(Pool.prototype, 'end', async () => {});

    await assert.rejects(initMigrations(), (error) => {
      assert.match(error.message, /project is active/);
      assert.match(error.message, /MIGRATION_DATABASE_URL/);
      assert.doesNotMatch(error.message, /private-project/);
      return true;
    });
    assert.equal(end.mock.callCount(), 1);
  });
}
