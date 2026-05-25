import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const bootstrapPath = path.resolve('scripts', 'bootstrap-ssm-parameters.sh');
const postmarkPath = path.resolve('scripts', 'setup-postmark-secret.sh');
const mobileBuildPath = path.resolve('..', '..', 'apps', 'mobile', 'build.sh');

void test('bootstrap and mobile build scripts use stage-specific Supabase public values', () => {
  const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
  const postmarkSource = fs.readFileSync(postmarkPath, 'utf8');
  const mobileBuildSource = fs.readFileSync(mobileBuildPath, 'utf8');

  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/aznfyazjndfniwsocdka\.supabase\.co"/);
  assert.match(bootstrapSource, /resolve_publishable_key_stage_suffix\(\)/);
  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co"/);
  assert.match(bootstrapSource, /resolve_publishable_key\(\)/);
  assert.match(bootstrapSource, /SUPABASE_PUBLISHABLE_KEY_\$\{stage_suffix\}/);
  assert.match(
    bootstrapSource,
    /ERROR: Missing Supabase publishable key for stage '\$\{STAGE\}'\./
  );
  assert.match(
    bootstrapSource,
    /INFRA_AWS_ACCOUNT_ID is not set\. Refusing to write AWS resources\./
  );
  assert.match(
    bootstrapSource,
    /AWS account mismatch\. Expected \$\{expected_account_id\}, got \$\{current_account_id\}\./
  );
  assert.match(
    postmarkSource,
    /INFRA_AWS_ACCOUNT_ID is not set\. Refusing to update Secrets Manager\./
  );
  assert.match(
    postmarkSource,
    /AWS account mismatch\. Expected \$\{expected_account_id\}, got \$\{current_account_id\}\./
  );
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_URL=https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co/
  );
  assert.match(mobileBuildSource, /resolve_supabase_key_stage_suffix\(\)/);
  assert.match(mobileBuildSource, /resolve_stage_supabase_key\(\)/);
  assert.match(mobileBuildSource, /read_env_file_value\(\)/);
  assert.match(mobileBuildSource, /SUPABASE_PUBLISHABLE_KEY_\$\{stage_suffix\}/);
  assert.match(mobileBuildSource, /EXPO_PUBLIC_SUPABASE_KEY=\$\{stage_supabase_key\}/);
  assert.match(
    mobileBuildSource,
    /SUPABASE_PUBLISHABLE_KEY_\$\{stage_key_suffix\} is required for mobile stage/
  );
});
