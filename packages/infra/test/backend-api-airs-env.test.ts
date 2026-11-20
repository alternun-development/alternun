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
  // Admin tokens come from the admin panel's own Authentik provider, not the app's.
  assert.match(source, /ADMIN_AUTH_ISSUER: adminAuthIssuer/);
  assert.match(source, /ADMIN_AUTH_AUDIENCE: args\.settings\.adminAuth\.audience/);
  assert.match(source, /ADMIN_AUTH_JWKS_URL: adminAuthJwksUrl/);
  assert.match(source, /const ADMIN_AUTH_CLIENT_ID = 'alternun-admin'/);
  assert.match(source, /\/application\/o\/\$\{ADMIN_AUTH_CLIENT_ID\}\//);
  assert.doesNotMatch(source, /ADMIN_AUTH_ISSUER: authIssuer/);
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
