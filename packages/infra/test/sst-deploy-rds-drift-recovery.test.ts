import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sstDeployPath = path.resolve('scripts/sst-deploy.sh');

void test('sst-deploy retries once via sst refresh when Pulumi state retains an RDS instance AWS no longer has', () => {
  const source = fs.readFileSync(sstDeployPath, 'utf8');

  // Regression guard: a deploy whose Pulumi state still tracks an RDS
  // instance that was deleted outside of Pulumi (e.g. the identity-prod
  // deletion-protection incident) fails with DBInstanceNotFound on
  // ModifyDBInstance instead of recreating the instance. The deploy must
  // detect that signature and retry once after `sst refresh`, mirroring the
  // existing bucket-drift recovery path.
  assert.match(source, /should_attempt_rds_drift_recovery\(\)/);
  assert.match(source, /grep -q "DBInstanceNotFound" "\$log_file"/);
  assert.match(source, /if should_attempt_rds_drift_recovery "\$DEPLOY_LOG"; then/);
});

void test('the recovery refresh lifts identity RDS protection so Pulumi can drop the missing instance from state', () => {
  const source = fs.readFileSync(sstDeployPath, 'utf8');

  // On protected identity stages the RDS instance is declared with
  // protect: true (see modules/identity-resources.ts), and Pulumi refuses
  // to remove a protected resource from state during `sst refresh` even
  // when it's already gone in AWS. Without this override the refresh
  // exits nonzero under `set -e` and the recovery retry never runs.
  const blockStart = source.indexOf('should_attempt_rds_drift_recovery "$DEPLOY_LOG"; then');
  const refreshBlock = source.slice(
    blockStart,
    source.indexOf('npx sst refresh --stage "$STACK"', blockStart)
  );
  assert.match(refreshBlock, /INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT=true/);
});
