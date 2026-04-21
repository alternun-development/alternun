import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  isAdminSiteStackStage,
  isDashboardStackStage,
  parsePipelineStage,
} from '../config/pipelines/stages.ts';

const sstDeployPath = path.resolve('scripts/sst-deploy.sh');

void test('admin-dev stays admin-only and does not resolve as a dashboard pipeline alias', () => {
  assert.equal(isAdminSiteStackStage('admin-dev'), true);
  assert.equal(isDashboardStackStage('admin-dev'), false);
  assert.equal(parsePipelineStage('admin-dev'), undefined);
  assert.equal(isDashboardStackStage('dashboard-admin-dev'), true);
});

void test('sst deploy canonicalizes legacy backend aliases to api-dev and api-prod', () => {
  const source = fs.readFileSync(sstDeployPath, 'utf8');

  assert.match(source, /canonicalize_backend_stack_stage/);
  assert.match(source, /backend\|backend-dev\|backend-api\|backend-api-dev/);
  assert.match(
    source,
    /api-prod\|api-production\|backend-prod\|backend-production\|backend-api-prod\|backend-api-production/
  );
  assert.match(source, /Legacy backend stage .*deprecated/);
  assert.match(source, /using canonical stack/);
});
