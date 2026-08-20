import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const helperPath = path.join(repoRoot, 'packages/infra/scripts/resolve-ssm-env.sh');

void test('resolve-ssm-env rejects cached backend-aligned stages missing the backend db url', () => {
  const source = fs.readFileSync(helperPath, 'utf8');

  assert.match(source, /normalize_stage_value\(\)/);
  assert.match(source, /resolve_ssm_stage_name\(\)/);
  assert.match(source, /resolve_shared_ssm_stage_name\(\)/);
  assert.match(source, /backend-api-dev\|api-dev/);
  assert.match(source, /prod\|production\|\*production\*\|dashboard-prod/);
  assert.match(source, /printf '%s\\n' 'production'/);
  assert.match(source, /stage_requires_backend_database_url\(\)/);
  assert.match(source, /dashboard\*\|api\*\|backend\*/);
  assert.match(
    source,
    /fallback_stage=\$\(printf '%s' "\$\{STAGE:-\}" \| tr '\[:upper:\]' '\[:lower:\]' \| tr '_' '-'\)/
  );
  assert.match(
    source,
    /if \[ -n "\$fallback_stage" \] && \[ "\$fallback_stage" != "\$normalized_fallback_stage" \]; then/
  );
  assert.match(
    source,
    /Cached SSM env for stage '\$\{STAGE\}' is missing INFRA_BACKEND_API_DATABASE_URL; refreshing from SSM\./
  );
  assert.match(
    source,
    /if stage_requires_backend_database_url && \[ -z "\$\{INFRA_BACKEND_API_DATABASE_URL:-\}" \]; then/
  );
  assert.match(
    source,
    /if stage_requires_backend_database_url; then\n\s+export_env_from_ssm "INFRA_BACKEND_API_DATABASE_URL" "infra-backend-api-database-url"\n\s+else\n\s+export_env_from_ssm "INFRA_BACKEND_API_DATABASE_URL" "infra-backend-api-database-url" "\$\{DATABASE_URL:-\}"\n\s+fi/
  );
});

void test('resolve-ssm-env refreshes cached auth env when the public Supabase key is missing', () => {
  const source = fs.readFileSync(helperPath, 'utf8');

  assert.match(
    source,
    /Cached SSM env for stage '\$\{STAGE\}' is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY; refreshing from SSM\./
  );
  assert.match(
    source,
    /if \[ -z "\$\{EXPO_PUBLIC_SUPABASE_URL:-\}" \] \|\| \[ -z "\$\{EXPO_PUBLIC_SUPABASE_KEY:-\}" \]; then/
  );
  assert.match(
    source,
    /export_env_from_ssm "EXPO_PUBLIC_SUPABASE_URL" "expo-public-supabase-url" "" "\$\{SSM_SHARED_STAGE\}"/
  );
  assert.match(
    source,
    /export_env_from_ssm "EXPO_PUBLIC_SUPABASE_KEY" "expo-public-supabase-key" "" "\$\{SSM_SHARED_STAGE\}"/
  );
});

void test('resolve-ssm-env resolves Google and Discord OAuth credentials for production stages', () => {
  const source = fs.readFileSync(helperPath, 'utf8');

  // Isolate the production export_env_from_ssm block specifically (the dev-stage
  // case block above it already contains identical Google/Discord export lines,
  // so a whole-file regex search would pass even if the production block never
  // resolved these vars at all). The comment preceding this block is duplicated
  // above the ssm_param_names priming array, so anchor on the first export call
  // instead, which is unique to the export_env_from_ssm block.
  const anchor =
    'export_env_from_ssm "INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL" "infra-backend-api-auth-better-auth-url-prod"';
  const anchorIndex = source.indexOf(anchor);
  assert.notEqual(anchorIndex, -1, 'expected production case-block comment anchor not found');
  const blockEnd = source.indexOf('\n      ;;', anchorIndex);
  assert.notEqual(blockEnd, -1, 'expected end of production case block not found');
  const productionBlock = source.slice(anchorIndex, blockEnd);

  assert.match(
    productionBlock,
    /export_env_from_ssm "GOOGLE_AUTH_CLIENT_ID" "google-auth-client-id"/
  );
  assert.match(
    productionBlock,
    /export_env_from_ssm "GOOGLE_AUTH_CLIENT_SECRET" "google-auth-client-secret"/
  );
  assert.match(
    productionBlock,
    /export_env_from_ssm "DISCORD_AUTH_CLIENT_ID" "discord-auth-client-id"/
  );
  assert.match(
    productionBlock,
    /export_env_from_ssm "DISCORD_AUTH_CLIENT_SECRET" "discord-auth-client-secret"/
  );
});
