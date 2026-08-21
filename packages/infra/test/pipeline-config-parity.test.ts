import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const buildspecPath = path.resolve('buildspec.yml');
const envPath = path.resolve('.env');

function parseInfraPipelinesFromBuildspec(source: string): string[] {
  const match = source.match(/INFRA_PIPELINES:\s*'([^']*)'/);
  assert.ok(match, 'buildspec.yml is missing an INFRA_PIPELINES env entry');
  return match[1].split(',').map((value) => value.trim());
}

function parseInfraPipelinesFromEnv(source: string): string[] {
  const match = source.match(/^INFRA_PIPELINES=(.*)$/m);
  assert.ok(match, '.env is missing an INFRA_PIPELINES entry');
  return match[1].split(',').map((value) => value.trim());
}

void test('buildspec.yml and .env agree on which pipelines are managed', () => {
  // These two files are the actual inputs to real deploys: CI reads
  // INFRA_PIPELINES from buildspec.yml, local/manual deploys read it from
  // .env via _load-infra-env.sh. If they drift, a CI-triggered production
  // deploy computes a different desired pipeline set than whatever was last
  // reconciled locally, and sst-deploy.sh's pipeline deletion guard
  // (_pipeline-safety.sh) hard-fails the entire STACK=production deploy —
  // including the actual expo-web-production app resources bundled into
  // the same Pulumi program — until someone notices and reconciles AWS by
  // hand. Keep these in lockstep so that never happens silently.
  const buildspecSource = fs.readFileSync(buildspecPath, 'utf8');
  const envSource = fs.readFileSync(envPath, 'utf8');

  const buildspecPipelines = parseInfraPipelinesFromBuildspec(buildspecSource);
  const envPipelines = parseInfraPipelinesFromEnv(envSource);

  assert.deepEqual(
    [...buildspecPipelines].sort(),
    [...envPipelines].sort(),
    `INFRA_PIPELINES differs between buildspec.yml (${buildspecPipelines.join(
      ','
    )}) and .env (${envPipelines.join(',')}). ` +
      'Update both together, and if you are removing a pipeline, reconcile AWS in the same change ' +
      '(APPROVE=true INFRA_ALLOW_PIPELINE_DELETION=true STACK=production bash scripts/sst-deploy.sh) ' +
      'before merging — otherwise the next production deploy will refuse to run.'
  );
});
