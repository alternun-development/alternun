import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const identityModulePath = path.resolve('modules/identity.ts');
const identityDefaultsPath = path.resolve('config/infrastructure-specs.ts');

void test('identity infrastructure defaults to Tláo with Postmark as the alternate provider', () => {
  const identityModule = fs.readFileSync(identityModulePath, 'utf8');
  const defaults = fs.readFileSync(identityDefaultsPath, 'utf8');

  assert.match(identityModule, /IdentityEmailProvider = 'tlao' \| 'postmark'/);
  assert.match(identityModule, /provider === 'postmark' \? 'postmark' : 'tlao'/);
  assert.match(defaults, /emailProvider: 'tlao'/);
  assert.doesNotMatch(identityModule, /'ses'/);
});

void test('identity integration configuration provisions the shared user-sync webhook secret', () => {
  const resources = fs.readFileSync(path.resolve('modules/identity-resources.ts'), 'utf8');

  assert.match(resources, /user-sync-webhook-secret/);
  assert.match(resources, /userSyncWebhookSecret: webhookSecret/);
  assert.match(resources, /userSyncWebhookUrl:[\s\S]*?\/authentik\/webhook/);
  assert.match(resources, /webhookSecret: userSyncWebhookSecret\.result/);
});
