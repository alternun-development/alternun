import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

void test('identity RDS defaults use the minimum cost baseline', () => {
  const source = readFileSync(path.resolve('config/infrastructure-specs.ts'), 'utf8');

  assert.match(source, /instanceType:\s*'db\.t4g\.micro'/);
  assert.match(source, /storageGiB:\s*20/);
  assert.match(source, /multiAz:\s*false/);
  assert.match(source, /backupRetentionDays:\s*1/);
  assert.match(source, /performanceInsights:\s*false/);
  assert.match(source, /enhancedMonitoring:\s*false/);
});
