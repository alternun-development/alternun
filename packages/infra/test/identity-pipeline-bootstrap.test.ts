import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  assert.match(bootstrapScript, /resolve_selected_pipeline_csv/);
  assert.match(bootstrapScript, /emit_pipeline_keys_from_csv/);
  assert.match(bootstrapScript, /case "\$stage" in[\s\S]*production\)[\s\S]*\*\)[\s\S]*exit 0/);
  assert.match(buildspecSource, /bootstrap-new-identity-pipelines\.sh"? record/);
  assert.match(buildspecSource, /bootstrap-new-identity-pipelines\.sh"? start-recorded/);
  assert.match(
    readInfraFile('infra.config.ts'),
    /process\.env\.INFRA_CODESTAR_CONNECTION_ARN \?\? localConfig\.pipeline\?\.codestarConnectionArn/
  );
  assert.match(
    readInfraFile('modules/identity-resources.ts'),
    /INFRA_IDENTITY_EXISTING_SMTP_SECRET_NAME/
  );
  assert.match(readInfraFile('modules/identity-resources.ts'), /getSecretOutput/);
  assert.match(
    readInfraFile('config/pipelines/specs/identity.ts'),
    /INFRA_IDENTITY_EXISTING_SMTP_SECRET_NAME:[\s\S]*smtp-credentials-v2\/identity-prod/
  );
});

void test('production bootstrap ignores identity pipelines omitted from INFRA_PIPELINES', (t) => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'alternun-identity-bootstrap-test-'));
  const mockBin = join(tempRoot, 'bin');
  const stateDirectory = join(tempRoot, 'state');
  const callsPath = join(tempRoot, 'aws-calls.log');
  const awsPath = join(mockBin, 'aws');

  mkdirSync(mockBin);
  writeFileSync(callsPath, '', 'utf8');
  writeFileSync(
    awsPath,
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$ALTERNUN_AWS_CALLS"
exit 1
`,
    'utf8'
  );
  chmodSync(awsPath, 0o755);

  t.after(() => rmSync(tempRoot, { recursive: true, force: true }));

  const env = {
    ...process.env,
    ALTERNUN_AWS_CALLS: callsPath,
    IDENTITY_PIPELINE_BOOTSTRAP_STATE_DIR: stateDirectory,
    INFRA_PIPELINES: 'production',
    PATH: `${mockBin}:${process.env.PATH}`,
    SST_STAGE: 'production',
  };
  const scriptPath = join(infraRoot, 'scripts', 'bootstrap-new-identity-pipelines.sh');

  execFileSync('bash', [scriptPath, 'record'], { env });
  execFileSync('bash', [scriptPath, 'start-recorded'], { env });

  assert.equal(readFileSync(callsPath, 'utf8'), '');
});

void test('production bootstrap starts a newly created identity pipeline after its failed creation record', (t) => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'alternun-identity-bootstrap-test-'));
  const mockBin = join(tempRoot, 'bin');
  const stateDirectory = join(tempRoot, 'state');
  const callsPath = join(tempRoot, 'aws-calls.log');
  const awsPath = join(mockBin, 'aws');

  mkdirSync(mockBin);
  mkdirSync(stateDirectory);
  writeFileSync(join(stateDirectory, 'missing-pipelines'), 'alternun-auth-prod-pipeline\n', 'utf8');
  writeFileSync(callsPath, '', 'utf8');
  writeFileSync(
    awsPath,
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$ALTERNUN_AWS_CALLS"
case "$1" in
  codepipeline)
    case "$2" in
      get-pipeline|start-pipeline-execution) exit 0 ;;
      list-pipeline-executions) printf '%s\\n' 'Failed'; exit 0 ;;
    esac
    ;;
esac
exit 1
`,
    'utf8'
  );
  chmodSync(awsPath, 0o755);

  t.after(() => rmSync(tempRoot, { recursive: true, force: true }));

  execFileSync(
    'bash',
    [join(infraRoot, 'scripts', 'bootstrap-new-identity-pipelines.sh'), 'start-recorded'],
    {
      env: {
        ...process.env,
        ALTERNUN_AWS_CALLS: callsPath,
        IDENTITY_PIPELINE_BOOTSTRAP_STATE_DIR: stateDirectory,
        PATH: `${mockBin}:${process.env.PATH}`,
        SST_STAGE: 'production',
      },
    }
  );

  assert.match(readFileSync(callsPath, 'utf8'), /codepipeline start-pipeline-execution/);
});
