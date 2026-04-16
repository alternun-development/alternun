import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const backendApiModulePath = path.resolve('modules/backend-api.ts');

void test('backend API module forwards Better Auth runtime env into the Lambda config', () => {
  const source = fs.readFileSync(backendApiModulePath, 'utf8');

  assert.match(source, /AUTH_BETTER_AUTH_URL/);
  assert.match(source, /BETTER_AUTH_SECRET/);
  assert.match(source, /BETTER_AUTH_TRUSTED_ORIGINS/);
  assert.match(source, /GOOGLE_AUTH_CLIENT_ID/);
  assert.match(source, /GOOGLE_AUTH_CLIENT_SECRET/);
});
