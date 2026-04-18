import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dashboardSpecPath = path.resolve('config/pipelines/specs/dashboard.ts');

void test('dashboard pipeline spec forwards Better Auth runtime env to backend deploys', () => {
  const source = fs.readFileSync(dashboardSpecPath, 'utf8');

  assert.match(source, /INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL/);
  assert.match(source, /INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_ID/);
  assert.match(source, /INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_SECRET/);
  assert.match(source, /INFRA_BACKEND_API_DISCORD_AUTH_CLIENT_ID/);
  assert.match(source, /INFRA_BACKEND_API_DISCORD_AUTH_CLIENT_SECRET/);
});
