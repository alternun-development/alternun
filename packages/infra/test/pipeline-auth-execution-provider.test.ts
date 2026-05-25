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
  assert.match(
    source,
    /function buildAuthentikIssuerForStage\(stage: PipelineStage, env: NodeJS\.ProcessEnv\)/
  );
  assert.match(source, /function buildBetterAuthEnvForStage\(/);
  assert.match(
    source,
    /buildStageUrls\(\s*'api'\s*,\s*env\.INFRA_ROOT_DOMAIN \?\? 'alternun\.co'\s*\)/
  );
  assert.match(source, /const explicitApiUrl = env\.EXPO_PUBLIC_API_URL\?\.trim\(\);/);
  assert.match(source, /candidate\.host\.toLowerCase\(\) === expected\.host\.toLowerCase\(\)/);
  assert.match(source, /AUTH_BETTER_AUTH_URL: betterAuthUrl/);
  assert.match(source, /EXPO_PUBLIC_BETTER_AUTH_URL: betterAuthUrl/);
  assert.match(source, /AUTH_EXCHANGE_URL: authExchangeUrl/);
  assert.match(source, /EXPO_PUBLIC_AUTH_EXCHANGE_URL: authExchangeUrl/);
  assert.match(source, /EXPO_PUBLIC_AUTHENTIK_ISSUER: productionAuthentikIssuer/);
  assert.match(source, /EXPO_PUBLIC_AUTHENTIK_ISSUER: devAuthentikIssuer/);
  assert.match(source, /EXPO_PUBLIC_AUTHENTIK_ISSUER: mobileAuthentikIssuer/);
  assert.match(source, /\.\.\.buildBetterAuthEnvForStage\('dev', env\)/);
});

void test('production-style pipelines default to larger CodeBuild capacity and local cache', () => {
  const source = fs.readFileSync(infraConfigPath, 'utf8');

  assert.match(
    source,
    /pipeline === 'dev' \|\| pipeline === 'production' \|\| pipeline\.endsWith\('-prod'\)/
  );
  assert.match(source, /args\.type !== 'aws:codebuild\/project:Project'/);
  assert.match(source, /projectName\.endsWith\('-build'\)/);
  assert.match(source, /type: 'LOCAL'/);
  assert.match(source, /LOCAL_SOURCE_CACHE/);
  assert.match(source, /LOCAL_CUSTOM_CACHE/);
});

void test('managed CodePipeline resources are forced into queued execution mode', () => {
  const source = fs.readFileSync(infraConfigPath, 'utf8');

  assert.match(source, /pulumiRuntime\.registerStackTransformation\(/);
  assert.match(source, /args\.type !== 'aws:codepipeline\/pipeline:Pipeline'/);
  assert.match(source, /executionMode: 'QUEUED'/);
  assert.match(source, /pipelineName\.endsWith\('-pipeline'\)/);
});
