import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const buildspecPath = path.resolve('buildspec.yml');
const resolveSsmEnvPath = path.resolve('scripts/resolve-ssm-env.sh');

void test('buildspec sources the canonical SSM auth env helper and clears stale auth vars in CI', () => {
  const source = fs.readFileSync(buildspecPath, 'utf8');
  const helperSource = fs.readFileSync(resolveSsmEnvPath, 'utf8');

  assert.match(source, /source "\$\{INFRA_PATH\}\/scripts\/resolve-ssm-env\.sh"/);
  assert.match(source, /canonical SSM helper/);
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?AUTH_EXECUTION_PROVIDER[\s\S]*?EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER/
  );
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?AUTH_BETTER_AUTH_URL[\s\S]*?EXPO_PUBLIC_BETTER_AUTH_URL/
  );
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?AUTH_EXCHANGE_URL[\s\S]*?EXPO_PUBLIC_AUTH_EXCHANGE_URL/
  );
  assert.match(helperSource, /resolve_auth_execution_provider\(\)/);
  assert.match(helperSource, /export AUTH_EXECUTION_PROVIDER/);
  assert.match(helperSource, /export EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER/);
});
