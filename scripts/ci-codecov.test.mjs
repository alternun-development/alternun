import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
const mobilePackagePath = path.join(repoRoot, 'apps', 'mobile', 'package.json');

void test('ci workflow uploads mobile coverage to Codecov with the v5 action', () => {
  const workflowSource = fs.readFileSync(workflowPath, 'utf8');
  const mobilePackage = JSON.parse(fs.readFileSync(mobilePackagePath, 'utf8'));

  assert.equal(
    mobilePackage.scripts['test:coverage'],
    'jest --coverage --runInBand --watchAll=false'
  );
  assert.match(workflowSource, /Run mobile coverage tests/);
  assert.match(workflowSource, /pnpm --filter @alternun\/mobile run test:coverage/);
  assert.match(workflowSource, /codecov\/codecov-action@v5/);
  assert.match(workflowSource, /token:\s+\$\{\{\s*secrets\.CODECOV_TOKEN\s*\}\}/);
  assert.match(workflowSource, /files:\s+apps\/mobile\/coverage\/lcov\.info/);
  assert.doesNotMatch(workflowSource, /codecov\/codecov-action@v3/);
  assert.doesNotMatch(workflowSource, /file:\s+\.\/coverage\/lcov\.info/);
});
