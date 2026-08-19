import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const helperPath = path.resolve('scripts/resolve-secrets-manager-env.sh');

void test('resolve-secrets-manager-env hydrates the stage-mapped identity integration secret', () => {
  const source = fs.readFileSync(helperPath, 'utf8');

  assert.match(source, /resolve_identity_secret_stage\(\)/);
  assert.match(source, /dashboard-dev\|dashboardapi-dev\|dashboard-admin-dev/);
  assert.match(source, /dashboard-prod\|dashboard-production\|dashboardapi-prod/);
  assert.match(source, /identity-dev/);
  assert.match(source, /identity-prod/);
  assert.match(source, /INFRA_IDENTITY_ENABLED/);
  assert.match(source, /INFRA_ENABLE_BACKEND_API/);
  assert.match(source, /Skipped Secrets Manager auth env resolution/);
  assert.match(source, /Skipped retired identity secret resolution for backend stage/);
  assert.match(source, /configured backend OAuth credentials are complete/);
  assert.match(source, /backend_discord_credentials_complete/);
  assert.match(source, /backend_discord_not_configured/);
  assert.match(source, /googleClientId/);
  assert.match(source, /googleClientSecret/);
  assert.match(source, /discordClientId/);
  assert.match(source, /discordClientSecret/);
  assert.match(source, /INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_ID/);
  assert.match(source, /INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_SECRET/);
  assert.match(source, /INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID/);
  assert.match(source, /INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_SECRET/);
  assert.match(source, /GOOGLE_AUTH_CLIENT_SECRET/);
});
