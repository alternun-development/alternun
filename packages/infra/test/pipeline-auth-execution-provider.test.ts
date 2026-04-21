import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const corePath = path.resolve('config/pipelines/specs/core.ts');
const infraConfigPath = path.resolve('infra.config.ts');

void test('dev and mobile pipeline specs default auth execution to better-auth', () => {
  const source = fs.readFileSync(corePath, 'utf8');

  assert.match(source, /return stage === 'production' \? 'supabase' : 'better-auth';/);
  assert.match(
    source,
    /const devAuthExecutionProvider = resolveAuthExecutionProviderForStage\('dev', env\);/
  );
  assert.match(
    source,
    /const mobileAuthExecutionProvider = resolveAuthExecutionProviderForStage\('mobile', env\);/
  );
});

void test('dev pipeline spec injects Better Auth API-origin URLs', () => {
  const source = fs.readFileSync(corePath, 'utf8');

  assert.match(
    source,
    /function buildAuthExchangeUrlForStage\(stage: PipelineStage, env: NodeJS\.ProcessEnv\)/
  );
  assert.match(source, /function buildBetterAuthEnvForStage\(/);
  assert.match(source, /AUTH_BETTER_AUTH_URL: betterAuthUrl/);
  assert.match(source, /EXPO_PUBLIC_BETTER_AUTH_URL: betterAuthUrl/);
  assert.match(source, /AUTH_EXCHANGE_URL: authExchangeUrl/);
  assert.match(source, /EXPO_PUBLIC_AUTH_EXCHANGE_URL: authExchangeUrl/);
  assert.match(source, /\.\.\.buildBetterAuthEnvForStage\('dev', env\)/);
});

void test('managed CodePipeline resources are forced into queued execution mode', () => {
  const source = fs.readFileSync(infraConfigPath, 'utf8');

  assert.match(source, /pulumiRuntime\.registerStackTransformation\(/);
  assert.match(source, /args\.type !== 'aws:codepipeline\/pipeline:Pipeline'/);
  assert.match(source, /executionMode: 'QUEUED'/);
  assert.match(source, /pipelineName\.endsWith\('-pipeline'\)/);
});
