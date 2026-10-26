import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  ADMIN_SITE_INFRA_DEFAULTS,
  BACKEND_API_INFRA_DEFAULTS,
  EXPO_INFRA_DEFAULTS,
} from '../config/infrastructure-specs.ts';

void test('CI runs every deploy pipeline build command', () => {
  const ci = fs.readFileSync(path.resolve('../../.github/workflows/ci.yml'), 'utf8');

  for (const command of [
    BACKEND_API_INFRA_DEFAULTS.buildCommand,
    ADMIN_SITE_INFRA_DEFAULTS.buildCommand,
    EXPO_INFRA_DEFAULTS.buildCommand,
  ]) {
    assert.ok(
      ci.includes(`command: ${command}\n`),
      `.github/workflows/ci.yml pipeline-build job is missing: ${command}`
    );
  }
});
