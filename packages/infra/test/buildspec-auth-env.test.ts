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
  const resolveSsmSources = source.match(
    /source "\$\{INFRA_PATH\}\/scripts\/resolve-ssm-env\.sh"/g
  );
  const resolveSecretsSources = source.match(
    /source "\$\{INFRA_PATH\}\/scripts\/resolve-secrets-manager-env\.sh"/g
  );

  assert.match(source, /source "\$\{INFRA_PATH\}\/scripts\/resolve-ssm-env\.sh"/);
  assert.match(source, /source "\$\{INFRA_PATH\}\/scripts\/resolve-secrets-manager-env\.sh"/);
  assert.ok((resolveSsmSources?.length ?? 0) >= 2);
  assert.ok((resolveSecretsSources?.length ?? 0) >= 2);
  assert.doesNotMatch(source, /alternun\/ci\/infra\/expo-public:EXPO_PUBLIC_SUPABASE_URL/);
  assert.doesNotMatch(source, /alternun\/ci\/infra\/expo-public:EXPO_PUBLIC_SUPABASE_KEY/);
  assert.doesNotMatch(
    source,
    /alternun\/ci\/infra\/expo-public:EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID/
  );
  assert.match(source, /canonical SSM helper/);
  assert.match(source, /INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS: 'false'/);
  assert.match(source, /INFRA_STATIC_SITE_INVALIDATION_WAIT: 'false'/);
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?EXPO_PUBLIC_API_URL[\s\S]*?INFRA_BACKEND_API_SUPABASE_URL[\s\S]*?INFRA_BACKEND_API_SUPABASE_ANON_KEY[\s\S]*?AUTH_EXECUTION_PROVIDER[\s\S]*?EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER/
  );
  assert.match(helperSource, /INFRA_BACKEND_API_SUPABASE_URL/);
  assert.match(helperSource, /INFRA_BACKEND_API_SUPABASE_ANON_KEY/);
  assert.match(helperSource, /INFRA_BACKEND_API_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?AUTH_EXECUTION_PROVIDER[\s\S]*?EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER[\s\S]*?DATABASE_URL[\s\S]*?SUPABASE_URL[\s\S]*?SUPABASE_KEY[\s\S]*?SUPABASE_ANON_KEY[\s\S]*?SUPABASE_DATABASE_URL/
  );
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?AUTH_BETTER_AUTH_URL[\s\S]*?EXPO_PUBLIC_BETTER_AUTH_URL/
  );
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?AUTH_EXCHANGE_URL[\s\S]*?EXPO_PUBLIC_AUTH_EXCHANGE_URL/
  );
  assert.match(
    helperSource,
    /unset\s+\\[\s\S]*?EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE[\s\S]*?INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL[\s\S]*?INFRA_BACKEND_API_DATABASE_URL/
  );
  assert.match(helperSource, /resolve_auth_execution_provider\(\)/);
  assert.match(helperSource, /prime_ssm_param_cache\(\)/);
  assert.match(helperSource, /aws ssm get-parameters/);
  assert.match(helperSource, /CACHE_FILE=/);
  assert.match(
    helperSource,
    /if \[ "\$\{CODEBUILD_BUILD_ID:-\}" != "" \] \|\| \[ "\$\{CI:-\}" = "true" \]; then[\s\S]*?return 1[\s\S]*?fi/
  );
  assert.match(helperSource, /aws ssm get-parameters[\s\S]*?--with-decryption/);
  assert.match(helperSource, /aws ssm get-parameter[\s\S]*?--with-decryption/);
  assert.match(helperSource, /INFRA_BACKEND_API_DATABASE_URL[\s\S]*?AQICA\*/);
  assert.match(helperSource, /\*:\/\/\*/);
  assert.match(helperSource, /write_cached_env\(\)/);
  assert.match(helperSource, /export AUTH_EXECUTION_PROVIDER/);
  assert.match(helperSource, /export EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER/);
  assert.match(sstDeploySource, /source "\$SCRIPT_DIR\/resolve-ssm-env\.sh"/);
  assert.match(sstDeploySource, /source "\$SCRIPT_DIR\/resolve-secrets-manager-env\.sh"/);
  assert.match(
    source,
    /APPROVE=true STACK="\$\{SST_STAGE\}" bash "\$\{INFRA_PATH\}\/scripts\/sst-deploy\.sh"/
  );
  assert.doesNotMatch(source, /npx sst deploy --stage "\$\{SST_STAGE\}" --yes/);
});
