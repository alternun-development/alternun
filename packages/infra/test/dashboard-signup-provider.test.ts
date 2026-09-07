import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dashboardSpecPath = path.resolve('config/pipelines/specs/dashboard.ts');

void test('dashboard keeps testnet signup on Better Auth and production email signup on the supported Supabase path', () => {
  const source = fs.readFileSync(dashboardSpecPath, 'utf8');

  assert.match(
    source,
    /'dashboard-dev':[\s\S]*?INFRA_BACKEND_API_AUTH_SIGNUP_PROVIDER:\s*'better-auth'/
  );
  assert.match(
    source,
    /'dashboard-prod':[\s\S]*?INFRA_BACKEND_API_AUTH_SIGNUP_PROVIDER:\s*'supabase'/
  );
});

void test('dashboard-prod points the identity integration-config secret at the -v2 name', () => {
  const source = fs.readFileSync(dashboardSpecPath, 'utf8');

  assert.match(
    source,
    /'dashboard-prod':[\s\S]*?INFRA_IDENTITY_SECRET_INTEGRATION_CONFIG_NAME:\s*\n?\s*'alternun-infra\/identity\/integration-config-v2'/
  );
});
