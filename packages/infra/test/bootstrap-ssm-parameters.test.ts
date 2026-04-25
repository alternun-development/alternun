import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const bootstrapPath = path.resolve('scripts', 'bootstrap-ssm-parameters.sh');
const mobileBuildPath = path.resolve('..', '..', 'apps', 'mobile', 'build.sh');

void test('bootstrap and mobile build scripts use stage-specific Supabase public values', () => {
  const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
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
