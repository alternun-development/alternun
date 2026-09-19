const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');

const { loadLocalApiEnv } = require('../src/bootstrap-env.ts');

test('loadLocalApiEnv loads local API env files for dev runs', () => {
  const originalEnv = { ...process.env };
  const tempDir = mkdtempSync(join(tmpdir(), 'alternun-api-env-'));
  const envPath = join(tempDir, '.env');

  try {
    process.env.PORT = '8082';
    process.env.AUTH_BETTER_AUTH_URL = 'https://stale.example.com';
    process.env.BETTER_AUTH_URL = 'https://stale-internal.example.com';

    writeFileSync(
      envPath,
      [
        '# local api env',
        'PORT=9091',
        'AUTH_BETTER_AUTH_URL=http://localhost:8082/auth',
        'BETTER_AUTH_URL=http://localhost:8082',
        'EXPORTED_VALUE="hello world"',
        'EMPTY_VALUE=',
        'export EXPORTED_FLAG=enabled',
      ].join('\n')
    );

    loadLocalApiEnv(envPath);

    assert.equal(process.env.PORT, '9091');
    assert.equal(process.env.AUTH_BETTER_AUTH_URL, 'http://localhost:8082/auth');
    assert.equal(process.env.BETTER_AUTH_URL, 'http://localhost:8082');
    assert.equal(process.env.EXPORTED_VALUE, 'hello world');
    assert.equal(process.env.EMPTY_VALUE, '');
    assert.equal(process.env.EXPORTED_FLAG, 'enabled');
  } finally {
    process.env = originalEnv;
  }
});

test('loadLocalApiEnv falls back to the repo root env before the local API env', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  const tempRoot = mkdtempSync(join(tmpdir(), 'alternun-api-root-'));
  const tempApiDir = join(tempRoot, 'apps', 'api');
  const rootEnvPath = join(tempRoot, '.env');
  const localEnvPath = join(tempApiDir, '.env');

  try {
    mkdirSync(tempApiDir, { recursive: true });

    writeFileSync(
      rootEnvPath,
      [
        '# repo root env',
        'GOOGLE_AUTH_CLIENT_ID=example-root-google-client',
        'GOOGLE_AUTH_CLIENT_SECRET=example-root-google-secret',
        'DISCORD_AUTH_CLIENT_ID=example-root-discord-client',
        'DISCORD_AUTH_CLIENT_SECRET=example-root-discord-secret',
        'PORT=8088',
      ].join('\n')
    );

    writeFileSync(
      localEnvPath,
      [
        '# local api env',
        'PORT=9091',
        'AUTH_BETTER_AUTH_URL=http://localhost:8082/auth',
        'BETTER_AUTH_URL=http://localhost:8082',
        'EXPORTED_VALUE="hello world"',
      ].join('\n')
    );

    process.chdir(tempApiDir);
    process.env.PORT = '8082';
    process.env.GOOGLE_AUTH_CLIENT_ID = 'example-stale-google-client';
    process.env.GOOGLE_AUTH_CLIENT_SECRET = 'example-stale-google-secret';

    loadLocalApiEnv();

    assert.equal(process.env.PORT, '9091');
    assert.equal(process.env.AUTH_BETTER_AUTH_URL, 'http://localhost:8082/auth');
    assert.equal(process.env.BETTER_AUTH_URL, 'http://localhost:8082');
    assert.equal(process.env.GOOGLE_AUTH_CLIENT_ID, 'example-root-google-client');
    assert.equal(process.env.GOOGLE_AUTH_CLIENT_SECRET, 'example-root-google-secret');
    assert.equal(process.env.DISCORD_AUTH_CLIENT_ID, 'example-root-discord-client');
    assert.equal(process.env.DISCORD_AUTH_CLIENT_SECRET, 'example-root-discord-secret');
    assert.equal(process.env.EXPORTED_VALUE, 'hello world');
  } finally {
    process.chdir(originalCwd);
    process.env = originalEnv;
  }
});

for (const launchFrom of ['root', 'apps/api']) {
  test(`loadLocalApiEnv applies root then API overrides when launched from ${launchFrom}`, () => {
    const originalEnv = { ...process.env };
    const originalCwd = process.cwd();
    const tempRoot = mkdtempSync(join(tmpdir(), 'alternun-api-launch-'));
    const apiDir = join(tempRoot, 'apps', 'api');

    try {
      mkdirSync(apiDir, { recursive: true });
      writeFileSync(
        join(tempRoot, '.env'),
        'MIGRATION_DATABASE_URL=postgresql://root.example/db\nROOT_ONLY=shared\nPORT=8088'
      );
      writeFileSync(
        join(apiDir, '.env'),
        'MIGRATION_DATABASE_URL=postgresql://api.example/db\nPORT=9091'
      );
      process.env.NODE_ENV = 'development';
      process.env.MIGRATION_DATABASE_URL = 'postgresql://shell.example/db';
      process.env.SHELL_ONLY = 'preserved';
      process.chdir(launchFrom === 'root' ? tempRoot : apiDir);

      loadLocalApiEnv();

      assert.equal(process.env.MIGRATION_DATABASE_URL, 'postgresql://api.example/db');
      assert.equal(process.env.PORT, '9091');
      assert.equal(process.env.ROOT_ONLY, 'shared');
      assert.equal(process.env.SHELL_ONLY, 'preserved');
    } finally {
      process.chdir(originalCwd);
      process.env = originalEnv;
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
}

test('an explicit env file stays isolated from automatic root and API env loading', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  const tempRoot = mkdtempSync(join(tmpdir(), 'alternun-api-explicit-'));
  try {
    mkdirSync(join(tempRoot, 'apps', 'api'), { recursive: true });
    writeFileSync(join(tempRoot, '.env'), 'PORT=8088\nEXPLICIT_UNRELATED=root');
    writeFileSync(join(tempRoot, 'apps', 'api', '.env'), 'PORT=9091\nEXPLICIT_UNRELATED=api');
    const customEnvPath = join(tempRoot, 'custom.env');
    writeFileSync(customEnvPath, 'PORT=9092');
    process.env.NODE_ENV = 'development';
    process.env.EXPLICIT_UNRELATED = 'shell';
    process.chdir(tempRoot);

    loadLocalApiEnv(customEnvPath);

    assert.equal(process.env.PORT, '9092');
    assert.equal(process.env.EXPLICIT_UNRELATED, 'shell');
  } finally {
    process.chdir(originalCwd);
    process.env = originalEnv;
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('production preserves process environment without reading local files', () => {
  const originalEnv = { ...process.env };
  const tempRoot = mkdtempSync(join(tmpdir(), 'alternun-api-production-'));
  try {
    const envPath = join(tempRoot, '.env');
    writeFileSync(envPath, 'PORT=9091');
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8082';

    loadLocalApiEnv(envPath);

    assert.equal(process.env.PORT, '8082');
  } finally {
    process.env = originalEnv;
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
