import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const corePath = path.resolve('config/pipelines/specs/core.ts');

void test('dev and mobile pipeline specs default auth execution to better-auth', () => {
  const source = fs.readFileSync(corePath, 'utf8');

  assert.match(source, /return stage === 'production' \? 'supabase' : 'better-auth';/);
});
