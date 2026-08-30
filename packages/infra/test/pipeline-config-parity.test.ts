import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const buildspecPath = path.resolve('buildspec.yml');
const envPath = path.resolve('.env');
const envExamplePath = path.resolve('.env.example');

function parseInfraPipelinesFromBuildspec(source: string): string[] {
  const match = source.match(/INFRA_PIPELINES:\s*'([^']*)'/);
  assert.ok(match, 'buildspec.yml is missing an INFRA_PIPELINES env entry');
  return match[1].split(',').map((value) => value.trim());
}

function parseInfraPipelinesFromEnvFile(source: string, label: string): string[] {
  const match = source.match(/^INFRA_PIPELINES=(.*)$/m);
  assert.ok(match, `${label} is missing an INFRA_PIPELINES entry`);
  return match[1].split(',').map((value) => value.trim());
}

void test('buildspec.yml and the tracked env template agree on which pipelines are managed', () => {
  // buildspec.yml is what CI/CodeBuild actually reads for real deploys.
  // packages/infra/.env (a real developer's local copy, used by manual
  // deploys via _load-infra-env.sh) is gitignored and does not exist on a
  // clean checkout, so it can't be the comparison source here — fall back
  // to it only when present, and always compare against the tracked
  // .env.example, which is the documented canonical value every .env is
  // copied from and is guaranteed to exist in any checkout including CI.
  //
  // If these drift, a CI-triggered production deploy computes a different
  // desired pipeline set than whatever was last reconciled in AWS, and
  // sst-deploy.sh's pipeline deletion guard (_pipeline-safety.sh) hard-fails
  // the entire STACK=production deploy — including the actual
  // expo-web-production app resources bundled into the same Pulumi program
  // — until someone notices and reconciles AWS by hand. That's exactly what
  // broke alternun-prod-pipeline on 2026-08-20.
  const buildspecSource = fs.readFileSync(buildspecPath, 'utf8');
  const envExampleSource = fs.readFileSync(envExamplePath, 'utf8');

  const buildspecPipelines = parseInfraPipelinesFromBuildspec(buildspecSource);
  const envExamplePipelines = parseInfraPipelinesFromEnvFile(envExampleSource, '.env.example');
  const expectedManagedPipelines = [
    'production',
    'dev',
    'identity-dev',
    'identity-prod',
    'dashboard-dev',
    'dashboard-prod',
  ];

  const mismatchMessage = (label: string, pipelines: string[]) =>
    `INFRA_PIPELINES differs between buildspec.yml (${buildspecPipelines.join(
      ','
    )}) and ${label} (${pipelines.join(',')}). ` +
    'Update both together, and if you are removing a pipeline, reconcile AWS in the same change ' +
    '(APPROVE=true INFRA_ALLOW_PIPELINE_DELETION=true STACK=production bash scripts/sst-deploy.sh) ' +
    'before merging — otherwise the next production deploy will refuse to run.';

  assert.deepEqual(
    [...buildspecPipelines].sort(),
    [...expectedManagedPipelines].sort(),
    'buildspec.yml must provision the identity pipelines so branch-based releases deploy Authentik.'
  );

  assert.deepEqual(
    [...envExamplePipelines].sort(),
    [...expectedManagedPipelines].sort(),
    '.env.example must document every managed release pipeline.'
  );

  assert.deepEqual(
    [...buildspecPipelines].sort(),
    [...envExamplePipelines].sort(),
    mismatchMessage('.env.example', envExamplePipelines)
  );

  if (fs.existsSync(envPath)) {
    const envPipelines = parseInfraPipelinesFromEnvFile(fs.readFileSync(envPath, 'utf8'), '.env');
    assert.deepEqual(
      [...buildspecPipelines].sort(),
      [...envPipelines].sort(),
      mismatchMessage('.env', envPipelines)
    );
  }
});
