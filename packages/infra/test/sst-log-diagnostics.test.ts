import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const ensureSecretsPath = path.join(repoRoot, 'packages/infra/scripts/ensure-secrets.sh');
const sstDeployPath = path.join(repoRoot, 'packages/infra/scripts/sst-deploy.sh');

void test('sst helpers print log tails when secret sync or deploy fails', () => {
  const ensureSecretsSource = fs.readFileSync(ensureSecretsPath, 'utf8');
  const sstDeploySource = fs.readFileSync(sstDeployPath, 'utf8');

  assert.match(ensureSecretsSource, /print_sst_diagnostics\(\)/);
  assert.match(ensureSecretsSource, /Recent SST log tail/);
  assert.match(ensureSecretsSource, /cat "\$tmp_log"/);
  assert.match(sstDeploySource, /print_recent_sst_logs\(\)/);
  assert.match(sstDeploySource, /Recent SST log tail/);
  assert.match(sstDeploySource, /tail -n 120 "\$log_file"/);
  assert.match(sstDeploySource, /sst deploy --stage "\$STACK" --yes --print-logs/);
});
