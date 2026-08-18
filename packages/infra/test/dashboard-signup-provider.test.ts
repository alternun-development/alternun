import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dashboardSpecPath = path.resolve('config/pipelines/specs/dashboard.ts');

void test('dashboard deployments explicitly use Better Auth for email signup', () => {
  const source = fs.readFileSync(dashboardSpecPath, 'utf8');

  assert.match(source, /INFRA_BACKEND_API_AUTH_SIGNUP_PROVIDER:\s*'better-auth'/);
});
