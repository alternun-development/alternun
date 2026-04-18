import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const coreSpecPath = path.resolve('config/pipelines/specs/core.ts');

void test('core pipeline spec keeps testnet Discord-visible social mode on Better Auth', () => {
  const source = fs.readFileSync(coreSpecPath, 'utf8');

  assert.match(source, /dev:[\s\S]*?EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik'/);
  assert.match(source, /production:[\s\S]*?EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik'/);
});
