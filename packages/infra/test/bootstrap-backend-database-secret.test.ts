import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const scriptPath = path.resolve('../../scripts/bootstrap-backend-database-secret.sh');

void test('bootstrap-backend-database-secret writes the stage-scoped secret names', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.match(source, /alternun\/api\/database-url-dev/);
  assert.match(source, /alternun\/api\/database-url/);
  assert.match(source, /infra-backend-api-database-url-dev/);
  assert.match(source, /infra-backend-api-database-url-prod/);
  assert.match(source, /put-secret-value/);
  assert.match(source, /put-parameter/);
});
