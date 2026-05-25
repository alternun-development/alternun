import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const scriptPath = path.join(repoRoot, 'packages/infra/scripts/sst-deploy.sh');
const loadEnvPath = path.join(repoRoot, 'packages/infra/scripts/_load-infra-env.sh');

void test('sst-deploy bootstraps backend env before SSM hydration', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  const stageDefaultsIndex = source.indexOf('pre_stage_normalized=');
  const ssmSourceIndex = source.indexOf('source "$SCRIPT_DIR/resolve-ssm-env.sh"');

  assert.ok(stageDefaultsIndex >= 0, 'expected pre-stage defaults in sst-deploy.sh');
  assert.ok(ssmSourceIndex >= 0, 'expected resolve-ssm-env.sh in sst-deploy.sh');
  assert.ok(
    stageDefaultsIndex < ssmSourceIndex,
    'expected backend/admin defaults to be set before SSM hydration'
  );
  assert.match(
    source,
    /dashboard-dev\|dashboard-prod\|dashboard-production\|api-dev\|api-prod\|api-production\|backend-dev\|backend-prod\|backend-production\|backend-api-dev\|backend-api-prod\|backend-api-production/
  );
  assert.match(
    source,
    /dashboard-dev\|dashboard-prod\|dashboard-production\|admin-dev\|admin-prod\|admin-production\|backoffice-dev\|backoffice-prod\|backoffice-admin-dev\|backoffice-admin-prod/
  );
});

void test('infra env loader bridges CodeBuild SST node_modules to the infra package graph', () => {
  const source = fs.readFileSync(loadEnvPath, 'utf8');

  assert.match(source, /bridge_codebuild_sst_node_modules\(\)/);
  assert.match(source, /source_node_modules="\$repo_root\/packages\/infra\/node_modules"/);
  assert.match(source, /Bridged CodeBuild SST node_modules cache to repo package node_modules\./);
});

void test('sst-deploy syncs identity runtime verification through a dedicated script', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.match(
    source,
    /verify_runtime_b64=\$\(gzip_base64_file "\$INFRA_DIR\/scripts\/templates\/verify-authentik-runtime\.sh"\)/
  );
  assert.match(
    source,
    /timeout 120 bash \/opt\/alternun\/identity\/templates\/verify-authentik-runtime\.sh/
  );
  assert.match(
    source,
    /commands:\[\$c1,\$c2,\$c3,\$c4,\$c5,\$c6,\$c7,\$c8,\$c9,\$c10,\$c11,\$c12,\$c13,\$c14,\$c15,\$c16,\$c17\]/
  );
});
