import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const backendApiModulePath = path.resolve('modules/backend-api.ts');

void test('backend API Lambda receives AIRS mail configuration and can read its SMTP secret', () => {
  const source = fs.readFileSync(backendApiModulePath, 'utf8');

  assert.match(source, /SUPABASE_URL/);
  assert.match(source, /SUPABASE_ANON_KEY/);
  assert.match(source, /AUTHENTIK_SMTP_SECRET_ARN/);
  assert.match(source, /AIRS_SMTP_SECRET_ARN/);
  assert.match(source, /ADMIN_AUTH_ISSUER: authIssuer/);
  assert.match(source, /ADMIN_AUTH_AUDIENCE: args\.settings\.auth\.audience/);
  assert.match(source, /ADMIN_AUTH_JWKS_URL: authJwksUrl/);
  assert.match(
    source,
    /const authentikWebhookSecretEnvironmentVariable = \['AUTHENTIK', 'WEBHOOK', 'SECRET'\]\.join\('_'\)/
  );
  assert.match(source, /\[authentikWebhookSecretEnvironmentVariable\]: webhookSecret/);
  assert.match(source, /resolveWebhookSecretFromIntegrationConfig/);
  assert.match(source, /userSyncWebhookSecret/);
  assert.match(source, /AUTH_EMAIL_FROM/);
  assert.match(source, /AIRS_EMAIL_FROM/);
  assert.match(source, /AUTH_EMAIL_SENDER_NAME/);
  assert.match(source, /smtp-secret-read/);
  assert.match(source, /secretsmanager:GetSecretValue/);
  assert.match(source, /secretsmanager:DescribeSecret/);
  assert.match(source, /function resolveSmtpSecretPolicyResource/);
  assert.match(source, /aws\.getCallerIdentityOutput\(\{\}\)\.accountId/);
  assert.match(source, /secret:\$\{normalizedReference\}-\*/);
  assert.match(source, /Resource": "\$\{smtpSecretPolicyResource\}/);
});
