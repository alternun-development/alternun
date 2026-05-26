import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

const syncScriptPath = path.join(repoRoot, 'scripts/sync-db-migrations.sh');
const dbMigrateScriptPath = path.join(repoRoot, 'scripts/db-migrate.sh');

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
