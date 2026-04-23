import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const helperPath = path.resolve('scripts/resolve-ssm-env.sh');

void test('resolve-ssm-env rejects cached backend-aligned stages missing the backend db url', () => {
  const source = fs.readFileSync(helperPath, 'utf8');

  assert.match(source, /normalize_stage_value\(\)/);
  assert.match(source, /resolve_ssm_stage_name\(\)/);
  assert.match(source, /backend-api-dev\|api-dev/);
  assert.match(source, /stage_requires_backend_database_url\(\)/);
  assert.match(source, /dashboard\*\|api\*\|backend\*/);
  assert.match(
    source,
    /Cached SSM env for stage '\$\{STAGE\}' is missing INFRA_BACKEND_API_DATABASE_URL; refreshing from SSM\./
  );
  assert.match(
    source,
    /if stage_requires_backend_database_url && \[ -z "\$\{INFRA_BACKEND_API_DATABASE_URL:-\}" \]; then/
  );
  assert.match(
    source,
    /if stage_requires_backend_database_url; then\n\s+export_env_from_ssm "INFRA_BACKEND_API_DATABASE_URL" "infra-backend-api-database-url"\n\s+else\n\s+export_env_from_ssm "INFRA_BACKEND_API_DATABASE_URL" "infra-backend-api-database-url" "\$\{DATABASE_URL:-\}"\n\s+fi/
  );
});
