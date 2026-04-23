import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const apiSpecPath = path.resolve('config/pipelines/specs/api.ts');

void test('backend API pipeline spec forwards Supabase env into backend deploys', () => {
  const source = fs.readFileSync(apiSpecPath, 'utf8');

  assert.match(source, /INFRA_BACKEND_API_SUPABASE_URL/);
  assert.match(source, /INFRA_BACKEND_API_SUPABASE_ANON_KEY/);
  assert.match(source, /INFRA_BACKEND_API_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(source, /EXPO_PUBLIC_SUPABASE_KEY/);
});
