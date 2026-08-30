import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const infraRoot = join(import.meta.dirname, '..');
const readInfraFile = (relativePath: string) => readFileSync(join(infraRoot, relativePath), 'utf8');

void test('a production release starts identity pipelines that were created by that release', () => {
  const bootstrapScript = readInfraFile('scripts/bootstrap-new-identity-pipelines.sh');
  const buildspecSource = readInfraFile('buildspec.yml');

  assert.match(bootstrapScript, /identity-dev\) printf '%s\\n' 'auth-dev'/);
  assert.match(bootstrapScript, /identity-prod\) printf '%s\\n' 'auth-prod'/);
  assert.match(bootstrapScript, /aws codepipeline get-pipeline/);
  assert.match(bootstrapScript, /aws codepipeline start-pipeline-execution/);
  assert.match(bootstrapScript, /list-pipeline-executions/);
  assert.match(bootstrapScript, /case "\$stage" in[\s\S]*production\)[\s\S]*\*\)[\s\S]*exit 0/);
  assert.match(buildspecSource, /bootstrap-new-identity-pipelines\.sh"? record/);
  assert.match(buildspecSource, /bootstrap-new-identity-pipelines\.sh"? start-recorded/);
});
