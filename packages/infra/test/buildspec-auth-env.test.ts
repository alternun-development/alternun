import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const buildspecPath = path.resolve('buildspec.yml');

void test('buildspec sources the canonical SSM auth env helper', () => {
  const source = fs.readFileSync(buildspecPath, 'utf8');

  assert.match(source, /source "\$\{INFRA_PATH\}\/scripts\/resolve-ssm-env\.sh"/);
  assert.match(source, /canonical SSM helper/);
});
