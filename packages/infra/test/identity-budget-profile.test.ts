import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const identityPipelinePath = path.resolve('config/pipelines/specs/identity.ts');
const identityResourcesPath = path.resolve('modules/identity-resources.ts');
const localComposePath = path.resolve('dev/authentik/compose.yml');
const localEnvInitializerPath = path.resolve('dev/authentik/init-local-env.sh');

void test('production identity keeps the existing RDS and ALB topology until an explicit migration is enabled', () => {
  const source = fs.readFileSync(identityPipelinePath, 'utf8');
  const productionPipeline = source.split("'identity-prod':", 2)[1];

  assert.ok(productionPipeline, 'identity-prod pipeline must be configured');
  assert.match(source, /const productionEc2MigrationEnabled =/);
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_DATABASE_MODE: productionEc2MigrationEnabled \? 'ec2' : 'rds'/
  );
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_INGRESS_MODE_PRODUCTION:\s*productionEc2MigrationEnabled\s*\? 'instance'\s*:\s*'alb'/
  );
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_TLS_MODE_PRODUCTION:\s*productionEc2MigrationEnabled\s*\? 'acme-route53-dns-01'\s*:\s*'alb-acm'/
  );
  assert.match(
    productionPipeline,
    /INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE: productionEc2MigrationEnabled \? 'true' : 'false'/
  );
  assert.match(productionPipeline, /INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS: 'false'/);
  assert.match(productionPipeline, /INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG: ''/);
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_SECRET_AUTHENTIK_KEY_NAME:\s*'alternun-infra\/identity\/authentik-secret-key-v2'/
  );
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_SECRET_DB_CREDENTIALS_NAME:\s*'alternun-infra\/identity\/database-credentials-v2'/
  );
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_SECRET_SMTP_CREDENTIALS_NAME:\s*'alternun-infra\/identity\/smtp-credentials-v2'/
  );
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_SECRET_JWT_SIGNING_KEY_NAME:\s*'alternun-infra\/identity\/jwt-signing-key-v2'/
  );
  assert.match(
    productionPipeline,
    /INFRA_IDENTITY_SECRET_INTEGRATION_CONFIG_NAME:\s*'alternun-infra\/identity\/integration-config-v2'/
  );
});

void test('identity load balancers can be explicitly imported after a partial state recovery', () => {
  const source = fs.readFileSync(identityResourcesPath, 'utf8');

  assert.match(source, /INFRA_IDENTITY_IMPORT_EXISTING_ALB_ARN/);
  assert.match(source, /import: existingIdentityLoadBalancerArn \|\| undefined/);
  assert.match(source, /INFRA_IDENTITY_IMPORT_EXISTING_RDS_INSTANCE_IDENTIFIER/);
  assert.match(source, /import: existingIdentityDatabaseIdentifier \|\| undefined/);
  assert.match(
    source,
    /getSecretVersionOutput\(\{ secretId: existingDatabaseCredentialsSecret\.arn \}\)/
  );
  assert.match(
    source,
    /const databasePasswordValue = adoptedDatabasePassword \?\? databasePassword\.result/
  );
  assert.match(source, /password: databasePasswordValue/);
});

void test('local Authentik development uses isolated disposable Compose volumes', () => {
  const source = fs.readFileSync(localComposePath, 'utf8');

  assert.match(source, /name: alternun-authentik-dev/);
  assert.match(source, /authentik-dev-postgres:/);
  assert.match(source, /ghcr\.io\/goauthentik\/server/);
  assert.doesNotMatch(source, /\/var\/run\/docker\.sock/);
});

void test('local Authentik initializer generates, but never overwrites, local secrets', () => {
  const source = fs.readFileSync(localEnvInitializerPath, 'utf8');

  assert.match(source, /Refusing to overwrite/);
  assert.match(source, /openssl rand -hex 32/);
  assert.match(source, /openssl rand -hex 24/);
  assert.match(source, /umask 077/);
});
