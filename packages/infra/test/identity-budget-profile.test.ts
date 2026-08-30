import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const identityPipelinePath = path.resolve('config/pipelines/specs/identity.ts');
const localComposePath = path.resolve('dev/authentik/compose.yml');
const localEnvInitializerPath = path.resolve('dev/authentik/init-local-env.sh');

void test('production identity pipeline uses the single-instance budget profile', () => {
  const source = fs.readFileSync(identityPipelinePath, 'utf8');
  const productionPipeline = source.split("'identity-prod':", 2)[1];

  assert.ok(productionPipeline, 'identity-prod pipeline must be configured');
  assert.match(productionPipeline, /INFRA_IDENTITY_DATABASE_MODE: 'ec2'/);
  assert.match(productionPipeline, /INFRA_IDENTITY_INGRESS_MODE_PRODUCTION: 'instance'/);
  assert.match(productionPipeline, /INFRA_IDENTITY_TLS_MODE_PRODUCTION: 'acme-route53-dns-01'/);
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
  assert.doesNotMatch(productionPipeline, /INFRA_IDENTITY_DATABASE_MODE: 'rds'/);
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
