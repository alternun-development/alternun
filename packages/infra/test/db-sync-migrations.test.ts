import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

const syncScriptPath = path.join(repoRoot, 'scripts/sync-db-migrations.sh');
const dbMigrateScriptPath = path.join(repoRoot, 'scripts/db-migrate.sh');
const buildspecPath = path.join(repoRoot, 'packages/infra/buildspec.yml');
const dashboardPipelineSpecPath = path.join(
  repoRoot,
  'packages/infra/config/pipelines/specs/dashboard.ts'
);

void test('stage-aware migration sync wrapper resolves the backend secret and supports one-by-one apply', () => {
  const source = fs.readFileSync(syncScriptPath, 'utf8');
  const migrateSource = fs.readFileSync(dbMigrateScriptPath, 'utf8');

  assert.match(source, /source "\$SCRIPT_DIR\/backend-database-secret\.sh"/);
  assert.match(source, /source "\$SCRIPT_DIR\/setup-aws-account\.sh"/);
  assert.match(source, /resolve_backend_database_secret_name/);
  assert.match(source, /aws secretsmanager get-secret-value/);
  assert.match(source, /MIGRATION_DATABASE_URL=\$\(/);
  assert.match(source, /node "\$REPO_ROOT\/apps\/api\/scripts\/run-migration\.mjs"/);
  assert.match(source, /bash "\$SCRIPT_DIR\/db-migrate\.sh" --dry-run/);
  assert.match(source, /--file <migration\.sql>/);
  assert.match(source, /--all/);
  assert.match(source, /--force-prod/);
  assert.match(source, /APPROVE_PROD_MIGRATION=true/);
  assert.match(migrateSource, /if \[\[ -n "\$MIGRATION_DATABASE_URL" \]\]; then/);
  assert.match(migrateSource, /ENV_SOURCE="MIGRATION_DATABASE_URL"/);
  assert.match(
    migrateSource,
    /if \[\[ "\$ENVIRONMENT" == "PRODUCTION" && -z "\$DRY_RUN" \]\]; then/
  );
});

void test('dashboard pipeline deploys apply pending AIRS migrations before SST deployment', () => {
  const buildspecSource = fs.readFileSync(buildspecPath, 'utf8');
  const dashboardPipelineSource = fs.readFileSync(dashboardPipelineSpecPath, 'utf8');

  assert.match(dashboardPipelineSource, /INFRA_APPLY_PENDING_MIGRATIONS: 'true'/);
  assert.match(buildspecSource, /INFRA_APPLY_PENDING_MIGRATIONS:-false/);
  assert.match(buildspecSource, /INFRA_ENABLE_BACKEND_API:-false/);
  assert.match(buildspecSource, /bash scripts\/sync-db-migrations\.sh "\$\{SST_STAGE\}" --all/);
  assert.match(buildspecSource, /\$\{migration_force_prod\}/);
  assert.ok(
    buildspecSource.indexOf('sync-db-migrations.sh') <
      buildspecSource.indexOf('Deploying to ${SST_STAGE}'),
    'expected migrations to run before SST deployment'
  );
});
