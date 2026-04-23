import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const bootstrapPath = path.resolve('scripts', 'bootstrap-ssm-parameters.sh');
const mobileBuildPath = path.resolve('..', '..', 'apps', 'mobile', 'build.sh');

void test('bootstrap and mobile build scripts use stage-specific Supabase public values', () => {
  const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
  const mobileBuildSource = fs.readFileSync(mobileBuildPath, 'utf8');

  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co"/);
  assert.match(
    bootstrapSource,
    /SUPABASE_KEY="\$\{EXPO_PUBLIC_SUPABASE_KEY_DEV:-\$\{SUPABASE_KEY_DEV:-\$\{EXPO_PUBLIC_SUPABASE_KEY:-\$\{SUPABASE_KEY:-\}\}\}\}"/
  );
  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co"/);
  assert.match(
    bootstrapSource,
    /SUPABASE_KEY="\$\{EXPO_PUBLIC_SUPABASE_KEY_PROD:-\$\{SUPABASE_KEY_PROD:-\$\{EXPO_PUBLIC_SUPABASE_KEY:-\$\{SUPABASE_KEY:-\}\}\}\}"/
  );
  assert.match(
    bootstrapSource,
    /ERROR: Missing Supabase publishable key for stage '\$\{STAGE\}'\./
  );
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_URL=https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co/
  );
  assert.match(mobileBuildSource, /EXPO_PUBLIC_SUPABASE_KEY=\$\{stage_supabase_key\}/);
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_URL=https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co/
  );
  assert.match(mobileBuildSource, /EXPO_PUBLIC_SUPABASE_KEY=\$\{stage_supabase_key\}/);
});
