import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const backendApiModulePath = path.resolve('modules/backend-api.ts');

void test('backend API module forwards AIRS onboarding env into the Lambda config', () => {
  const source = fs.readFileSync(backendApiModulePath, 'utf8');

  assert.match(source, /SUPABASE_URL/);
  assert.match(source, /SUPABASE_ANON_KEY/);
  assert.match(source, /AUTHENTIK_SMTP_SECRET_ARN/);
});
