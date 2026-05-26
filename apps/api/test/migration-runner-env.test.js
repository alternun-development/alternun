const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const applyMigrationsPath = path.resolve('scripts/apply-migrations.ts');
const lambdaMigrationsPath = path.resolve('scripts/run-migrations-lambda.ts');
const oneOffMigrationPath = path.resolve('scripts/run-migration.mjs');

void test('migration runners prefer the explicit migration database override first', () => {
  const applySource = fs.readFileSync(applyMigrationsPath, 'utf8');
  const lambdaSource = fs.readFileSync(lambdaMigrationsPath, 'utf8');
  const oneOffSource = fs.readFileSync(oneOffMigrationPath, 'utf8');

  assert.match(applySource, /MIGRATION_DATABASE_URL/);
  assert.match(applySource, /INFRA_BACKEND_API_DATABASE_URL/);
  assert.match(applySource, /process\.env\.MIGRATION_DATABASE_URL\s*\?\?/);
  assert.match(applySource, /process\.env\.INFRA_BACKEND_API_DATABASE_URL\s*\?\?/);
  assert.match(applySource, /environment === 'production' && !dryRun && !process\.env\.APPROVE_PROD_MIGRATION/);
  assert.match(lambdaSource, /MIGRATION_DATABASE_URL/);
  assert.match(lambdaSource, /INFRA_BACKEND_API_DATABASE_URL/);
  assert.match(lambdaSource, /process\.env\.MIGRATION_DATABASE_URL\s*\?\?/);
  assert.match(lambdaSource, /process\.env\.INFRA_BACKEND_API_DATABASE_URL\s*\?\?/);
  assert.match(oneOffSource, /MIGRATION_DATABASE_URL/);
  assert.match(oneOffSource, /INFRA_BACKEND_API_DATABASE_URL/);
  assert.match(oneOffSource, /process\.env\.MIGRATION_DATABASE_URL\s*\|\|/);
  assert.match(oneOffSource, /process\.env\.INFRA_BACKEND_API_DATABASE_URL\s*\|\|/);
  assert.match(oneOffSource, /const migrationArg = process\.argv\[2\] \?\?/);
  assert.match(oneOffSource, /CREATE TABLE IF NOT EXISTS _migrations/);
  assert.match(oneOffSource, /INSERT INTO _migrations \(name, version\) VALUES/);
});
