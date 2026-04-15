const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync } = require('node:fs');
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
        'BETTER_AUTH_URL=http://localhost:9083',
        'EXPORTED_VALUE="hello world"',
        'EMPTY_VALUE=',
        'export EXPORTED_FLAG=enabled',
      ].join('\n')
    );

    loadLocalApiEnv(envPath);

    assert.equal(process.env.PORT, '9091');
    assert.equal(process.env.AUTH_BETTER_AUTH_URL, 'http://localhost:8082/auth');
    assert.equal(process.env.BETTER_AUTH_URL, 'http://localhost:9083');
    assert.equal(process.env.EXPORTED_VALUE, 'hello world');
    assert.equal(process.env.EMPTY_VALUE, '');
    assert.equal(process.env.EXPORTED_FLAG, 'enabled');
  } finally {
    process.env = originalEnv;
  }
});
