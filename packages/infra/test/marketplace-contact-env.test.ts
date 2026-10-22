import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

void test('marketplace contact email reaches API and Expo deployment environments', () => {
  const backend = fs.readFileSync(path.resolve('modules/backend-api.ts'), 'utf8');
  const expo = fs.readFileSync(path.resolve('config/expo.ts'), 'utf8');
  const infra = fs.readFileSync(path.resolve('infra.config.ts'), 'utf8');
  const apiPipeline = fs.readFileSync(path.resolve('config/pipelines/specs/api.ts'), 'utf8');
  const corePipeline = fs.readFileSync(path.resolve('config/pipelines/specs/core.ts'), 'utf8');

  assert.match(backend, /MARKETPLACE_CONTACT_EMAIL/);
  assert.match(expo, /EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL/);
  assert.match(infra, /EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL/);
  assert.match(apiPipeline, /MARKETPLACE_CONTACT_EMAIL/);
  assert.match(corePipeline, /MARKETPLACE_CONTACT_EMAIL/);
});
