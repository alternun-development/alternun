import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const expoConfigPath = path.resolve('config/expo.ts');

void test('deployment-stage Expo config derives stage-safe auth defaults instead of stale local values', () => {
  const source = fs.readFileSync(expoConfigPath, 'utf8');

  assert.match(
    source,
    /function resolveDeploymentStage\(env: NodeJS\.ProcessEnv\): PipelineStage \| undefined/
  );
  assert.match(source, /function buildIdentityDomainFromAirsDomain\(stageDomain: string\): string/);
  assert.match(
    source,
    /function buildAuthentikIssuerFromStageDomain\(stageDomain: string\): string/
  );
  assert.match(source, /function resolveStageAlignedBetterAuthUrl\(/);
  assert.match(source, /function resolveStageAlignedExactUrl\(/);
  assert.match(source, /const deploymentStage = resolveDeploymentStage\(env\);/);
  assert.match(source, /const authExecutionProvider = deploymentStage\s+\?\s+'better-auth'/);
  assert.match(source, /const apiUrl = deploymentStage\s+\?/);
  assert.match(source, /const authExchangeUrl = deploymentStage\s+\?/);
  assert.match(source, /const betterAuthUrl = deploymentStage\s+\?/);
  assert.match(source, /authentikIssuer: deploymentStage\s+\?/);
  assert.match(source, /authentikRedirectUri: deploymentStage\s+\?/);
  assert.match(source, /authentikLoginEntryMode: deploymentStage\s+\?\s+'source'/);
  assert.match(source, /authentikSocialLoginMode: deploymentStage\s+\?\s+'authentik'/);
  assert.match(source, /releaseUpdateMode: deploymentStage\s+\?\s+'on'/);
});
