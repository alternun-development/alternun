import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

const helperPath = path.join(repoRoot, 'scripts/backend-database-secret.sh');
const bootstrapScriptPath = path.join(repoRoot, 'scripts/bootstrap-backend-database-secret.sh');
const deployWithMigrationsPath = path.join(repoRoot, 'scripts/deploy-with-migrations.sh');
const fastDeployPath = path.join(repoRoot, 'scripts/sst-deploy-fast.sh');
const localMigrationsPath = path.join(repoRoot, 'scripts/apply-migrations-local.sh');

void test('backend database secret helper resolves the stage-scoped names', () => {
  const helperSource = fs.readFileSync(helperPath, 'utf8');
  const bootstrapSource = fs.readFileSync(bootstrapScriptPath, 'utf8');
  const deployWithMigrationsSource = fs.readFileSync(deployWithMigrationsPath, 'utf8');
  const fastDeploySource = fs.readFileSync(fastDeployPath, 'utf8');
  const localMigrationsSource = fs.readFileSync(localMigrationsPath, 'utf8');

  assert.match(helperSource, /dashboard-dev\|/);
  assert.match(helperSource, /dashboard-prod\|dashboard-production/);
  assert.match(helperSource, /alternun\/api\/infra-backend-api-database-url-dev/);
  assert.match(helperSource, /alternun\/api\/infra-backend-api-database-url-prod/);
  assert.match(helperSource, /resolve_backend_database_secret_name/);
  assert.match(helperSource, /resolve_backend_database_ssm_key/);

  assert.match(bootstrapSource, /source scripts\/backend-database-secret\.sh/);
  assert.match(bootstrapSource, /resolve_backend_database_secret_name/);
  assert.match(bootstrapSource, /resolve_backend_database_ssm_key/);
  assert.match(bootstrapSource, /put-secret-value/);
  assert.match(bootstrapSource, /put-parameter/);

  assert.match(deployWithMigrationsSource, /source scripts\/backend-database-secret\.sh/);
  assert.match(deployWithMigrationsSource, /resolve_backend_database_secret_name/);
  assert.match(fastDeploySource, /source scripts\/backend-database-secret\.sh/);
  assert.match(fastDeploySource, /resolve_backend_database_secret_name/);
  assert.match(localMigrationsSource, /source scripts\/backend-database-secret\.sh/);
  assert.match(localMigrationsSource, /resolve_backend_database_secret_name/);
});
