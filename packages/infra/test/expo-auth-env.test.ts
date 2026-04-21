import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const expoConfigPath = path.resolve('config/expo.ts');

void test('expo config derives Better Auth env from the API origin when better-auth is selected', () => {
  const source = fs.readFileSync(expoConfigPath, 'utf8');

  assert.match(
    source,
    /function resolveDeploymentStage\(env: NodeJS\.ProcessEnv\): PipelineStage \| undefined/
  );
  assert.match(source, /function resolveStageAlignedUrl\(/);
  assert.match(source, /function resolveStageAlignedBetterAuthUrl\(/);
  assert.match(source, /function resolveStageAlignedExactUrl\(/);
  assert.match(source, /const deploymentStage = resolveDeploymentStage\(env\);/);
  assert.match(source, /const apiUrl = deploymentStage\s+\?/);
  assert.match(source, /const explicitAuthExecutionProvider = normalizeAuthExecutionProvider\(/);
  assert.match(source, /function buildAuthExchangeUrl\(apiUrl: string \| undefined\)/);
  assert.match(source, /const authExchangeUrl = deploymentStage\s+\?/);
  assert.match(source, /const betterAuthUrl = deploymentStage\s+\?/);
  assert.match(source, /const authExecutionProvider = deploymentStage\s+\?\s+'better-auth'/);
  assert.match(source, /authentikSocialLoginMode: deploymentStage\s+\?\s+'authentik'/);
  assert.match(
    source,
    /releaseUpdateMode: deploymentStage\s+\?\s+'on'\s+:\s+env\.EXPO_PUBLIC_RELEASE_UPDATE_MODE/
  );
});
