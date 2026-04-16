import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const expoConfigPath = path.resolve('config/expo.ts');

void test('expo config derives Better Auth env from the auth exchange url fallback', () => {
  const source = fs.readFileSync(expoConfigPath, 'utf8');

  assert.match(source, /const authExchangeUrl =/);
  assert.match(source, /const betterAuthUrl = normalizeBetterAuthBaseUrl\(/);
  assert.match(source, /const authExecutionProvider =/);
  assert.match(source, /AUTH_EXCHANGE_URL/);
  assert.match(source, /EXPO_PUBLIC_AUTH_EXCHANGE_URL/);
});
