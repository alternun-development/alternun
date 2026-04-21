import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const bootstrapPath = path.resolve('packages', 'infra', 'scripts', 'bootstrap-ssm-parameters.sh');
const mobileBuildPath = path.resolve('apps', 'mobile', 'build.sh');

void test('bootstrap and mobile build scripts use stage-specific Supabase public values', () => {
  const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
  const mobileBuildSource = fs.readFileSync(mobileBuildPath, 'utf8');

  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/aznfyazjndfniwsocdka\.supabase\.co"/);
  assert.match(bootstrapSource, /SUPABASE_KEY_PREFIX="sb_publishable_"/);
  assert.match(bootstrapSource, /SUPABASE_KEY_DEV_SUFFIX_PART_1="Z8egrB_x2ya7eNQCN8qcOw"/);
  assert.match(bootstrapSource, /SUPABASE_KEY_DEV_SUFFIX_PART_2="Sxhmmt2O"/);
  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co"/);
  assert.match(bootstrapSource, /SUPABASE_KEY_PROD_SUFFIX_PART_1="hPlMCyy51TS4c67V7WkkIw"/);
  assert.match(bootstrapSource, /SUPABASE_KEY_PROD_SUFFIX_PART_2="p1Mv2Nze"/);
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_URL=https:\/\/aznfyazjndfniwsocdka\.supabase\.co/
  );
  assert.match(mobileBuildSource, /EXPO_PUBLIC_SUPABASE_KEY=\$\{stage_supabase_key\}/);
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_URL=https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co/
  );
  assert.match(mobileBuildSource, /EXPO_PUBLIC_SUPABASE_KEY=\$\{stage_supabase_key\}/);
});
