import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflowPath = path.join(repoRoot, '.github/workflows/release-promotion-guard.yml');

void test('production PRs are guarded as generated release promotions', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');

  assert.match(source, /pull_request:/);
  assert.match(source, /branches: \[master\]/);
  assert.match(source, /HEAD_REF.*pull_request\.head\.ref/);
  assert.match(source, /test "\$HEAD_REF" = "develop"/);
  assert.match(source, /chore: release vX\.Y\.Z/);
  assert.match(source, /alternun-release:patch/);
  assert.match(source, /release:manual-exception/);
  assert.match(source, /actions\/checkout@v4/);
  assert.match(source, /git fetch --tags --force/);
  assert.match(source, /TAG_SHA="\$\(git rev-parse --verify "v\$\{VERSION\}\^\{commit\}"\)"/);
  assert.match(source, /test "\$TAG_SHA" = "\$HEAD_SHA"/);
  assert.doesNotMatch(source, /merge-base --is-ancestor/);
});
