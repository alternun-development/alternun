const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const applyMigrationsPath = path.resolve('scripts/apply-migrations.ts');
const runMigrationsLambdaPath = path.resolve('scripts/run-migrations-lambda.ts');

test('migration runners keep the full YYYYMMDD_NNNN version and skip legacy Better Auth intermediates', () => {
  const applyMigrationsSource = fs.readFileSync(applyMigrationsPath, 'utf8');
  const runMigrationsLambdaSource = fs.readFileSync(runMigrationsLambdaPath, 'utf8');

  for (const source of [applyMigrationsSource, runMigrationsLambdaSource]) {
    assert.match(source, /match = file\.match\(\s*\/\^\(\\d\+_\\d\+\)_\(\.\+\)\\\.sql\$\/\s*\)/);
    assert.match(
      source,
      /skippedMigrationVersions = new Set\(\['20260417_0009', '20260417_0010'\]\)/
    );
  }
});
