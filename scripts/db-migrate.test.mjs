import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

void test('db migration wrapper accepts a local PostgreSQL URL as development', (t) => {
  const mockBinDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'alternun-db-migrate-test-'));
  t.after(() => fs.rmSync(mockBinDirectory, { recursive: true, force: true }));

  const awsMockPath = path.join(mockBinDirectory, 'aws');
  const pnpmMockPath = path.join(mockBinDirectory, 'pnpm');
  fs.writeFileSync(awsMockPath, '#!/bin/sh\necho 124120088516\n', 'utf8');
  fs.writeFileSync(pnpmMockPath, '#!/bin/sh\necho "mock pnpm $*"\n', 'utf8');
  fs.chmodSync(awsMockPath, 0o755);
  fs.chmodSync(pnpmMockPath, 0o755);

  const result = spawnSync('bash', ['scripts/db-migrate.sh', '--dry-run'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${mockBinDirectory}:${process.env.PATH}`,
      AWS_ACCESS_KEY_ID: 'test-access-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/localdb',
      DATABASE_URL_DEV: '',
      DATABASE_URL_PROD: '',
      INFRA_BACKEND_API_DATABASE_URL: '',
      MIGRATION_DATABASE_URL: '',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Environment: DEVELOPMENT/);
  assert.match(result.stdout, /mock pnpm --filter @alternun\/api run db:migrate -- --dry-run/);
});
