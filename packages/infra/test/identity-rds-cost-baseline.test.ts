import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

void test('identity RDS keeps production recovery while development uses the minimum cost baseline', () => {
  const defaultsSource = readFileSync(path.resolve('config/infrastructure-specs.ts'), 'utf8');
  const identitySource = readFileSync(path.resolve('modules/identity.ts'), 'utf8');

  assert.match(defaultsSource, /instanceType:\s*'db\.t4g\.micro'/);
  assert.match(defaultsSource, /storageGiB:\s*20/);
  assert.match(defaultsSource, /multiAz:\s*false/);
  assert.match(defaultsSource, /backupRetentionDays:\s*7/);
  assert.match(defaultsSource, /performanceInsights:\s*false/);
  assert.match(defaultsSource, /enhancedMonitoring:\s*false/);
  assert.match(identitySource, /function resolveIdentityRdsBackupRetentionDefault/);
  assert.match(identitySource, /'identity-production'/);
  assert.match(identitySource, /'auth-prod'/);
  assert.match(identitySource, /'authentik-prod'/);
  assert.match(identitySource, /:\s*1;/);
});
