import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const expoConfigPath = path.resolve('config/expo.ts');

void test('expo config derives Better Auth env from the API origin when better-auth is selected', () => {
  const source = fs.readFileSync(expoConfigPath, 'utf8');

  assert.match(source, /const apiUrl = normalizePublicUrl\(/);
  assert.match(source, /const explicitAuthExecutionProvider = normalizeAuthExecutionProvider\(/);
  assert.match(source, /function buildAuthExchangeUrl\(apiUrl: string \| undefined\)/);
  assert.match(source, /explicitAuthExecutionProvider === 'better-auth'/);
  assert.match(source, /buildAuthExchangeUrl\(apiUrl\)/);
  assert.match(source, /const betterAuthUrl = normalizeBetterAuthBaseUrl\(/);
  assert.match(
    source,
    /explicitAuthExecutionProvider \?\?[\s\S]*betterAuthUrl \? 'better-auth' : undefined/
  );
});
