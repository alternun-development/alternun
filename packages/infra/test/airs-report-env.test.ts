import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

void test('Airs report and Authentik sync settings reach the API Lambda from SSM', () => {
  const backend = fs.readFileSync(path.resolve('modules/backend-api.ts'), 'utf8');
  const resolver = fs.readFileSync(path.resolve('scripts/resolve-ssm-env.sh'), 'utf8');

  for (const name of [
    'AIRS_DASHBOARD_URL',
    'AIRS_REPORT_SUPPORT_EMAILS',
    'AUTHENTIK_API_URL',
    'AUTHENTIK_API_TOKEN',
  ]) {
    assert.match(backend, new RegExp(`${name}: args\\.env\\.INFRA_BACKEND_API_${name}`));
    assert.match(resolver, new RegExp(`"INFRA_BACKEND_API_${name}"`));
  }
  assert.match(resolver, /infra-backend-api-airs-dashboard-url-dev" "https:\/\/testnet\.airs\.alternun\.co"/);
});
