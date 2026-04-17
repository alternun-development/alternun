import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const buildspecPath = path.resolve('buildspec.yml');
const resolveSsmEnvPath = path.resolve('scripts/resolve-ssm-env.sh');
const sstDeployPath = path.resolve('scripts/sst-deploy.sh');

void test('buildspec sources the canonical SSM auth env helper and clears stale auth vars in CI', () => {
  const source = fs.readFileSync(buildspecPath, 'utf8');
  const helperSource = fs.readFileSync(resolveSsmEnvPath, 'utf8');
  const sstDeploySource = fs.readFileSync(sstDeployPath, 'utf8');

  assert.match(source, /source "\$\{INFRA_PATH\}\/scripts\/resolve-ssm-env\.sh"/);
  assert.match(source, /source "\$\{INFRA_PATH\}\/scripts\/resolve-secrets-manager-env\.sh"/);
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
  assert.match(helperSource, /prime_ssm_param_cache\(\)/);
  assert.match(helperSource, /aws ssm get-parameters/);
  assert.match(helperSource, /CACHE_FILE=/);
  assert.match(helperSource, /write_cached_env\(\)/);
  assert.match(helperSource, /export AUTH_EXECUTION_PROVIDER/);
  assert.match(helperSource, /export EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER/);
  assert.match(sstDeploySource, /source "\$SCRIPT_DIR\/resolve-ssm-env\.sh"/);
  assert.match(sstDeploySource, /source "\$SCRIPT_DIR\/resolve-secrets-manager-env\.sh"/);
});
