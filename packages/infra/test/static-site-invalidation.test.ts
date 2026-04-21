import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const infraConfigPath = path.resolve('infra.config.ts');
const adminSitePath = path.resolve('modules/admin-site.ts');
const buildspecPath = path.resolve('buildspec.yml');

void test('static site invalidation waits are configurable and default to non-blocking', () => {
  const infraConfigSource = fs.readFileSync(infraConfigPath, 'utf8');
  const adminSiteSource = fs.readFileSync(adminSitePath, 'utf8');
  const buildspecSource = fs.readFileSync(buildspecPath, 'utf8');

  assert.match(
    infraConfigSource,
    /parseBoolean\(\s*process\.env\.INFRA_STATIC_SITE_INVALIDATION_WAIT,\s*false\s*\)/
  );
  assert.match(infraConfigSource, /wait: staticSiteInvalidationWait/);
  assert.doesNotMatch(infraConfigSource, /wait:\s*stage\s*===\s*'production'/);

  assert.match(adminSiteSource, /invalidationWait:\s*boolean/);
  assert.match(adminSiteSource, /wait: args\.invalidationWait/);
  assert.doesNotMatch(adminSiteSource, /wait:\s*deploymentStage\s*===\s*'production'/);

  assert.match(buildspecSource, /INFRA_STATIC_SITE_INVALIDATION_WAIT: 'false'/);
});
