const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const applyMigrationsPath = path.resolve('scripts/apply-migrations.ts');
const lambdaMigrationsPath = path.resolve('scripts/run-migrations-lambda.ts');
const oneOffMigrationPath = path.resolve('scripts/run-migration.mjs');

void test('migration runners prefer the backend API database env first', () => {
  const applySource = fs.readFileSync(applyMigrationsPath, 'utf8');
  const lambdaSource = fs.readFileSync(lambdaMigrationsPath, 'utf8');
  const oneOffSource = fs.readFileSync(oneOffMigrationPath, 'utf8');

  assert.match(applySource, /INFRA_BACKEND_API_DATABASE_URL/);
  assert.match(applySource, /process\.env\.INFRA_BACKEND_API_DATABASE_URL\s*\?\?/);
  assert.match(lambdaSource, /INFRA_BACKEND_API_DATABASE_URL/);
  assert.match(lambdaSource, /process\.env\.INFRA_BACKEND_API_DATABASE_URL\s*\?\?/);
  assert.match(oneOffSource, /INFRA_BACKEND_API_DATABASE_URL/);
  assert.match(oneOffSource, /process\.env\.INFRA_BACKEND_API_DATABASE_URL\s*\|\|/);
});
