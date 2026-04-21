import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const bootstrapPath = path.resolve('scripts/bootstrap-ssm-parameters.sh');
const mobileBuildPath = path.resolve('..', '..', 'apps', 'mobile', 'build.sh');

void test('bootstrap and mobile build scripts use stage-specific Supabase public values', () => {
  const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');
  const mobileBuildSource = fs.readFileSync(mobileBuildPath, 'utf8');

  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/aznfyazjndfniwsocdka\.supabase\.co"/);
  assert.match(bootstrapSource, /SUPABASE_KEY="sb_publishable_Z8egrB_x2ya7eNQCN8qcOw_Sxhmmt2O"/);
  assert.match(bootstrapSource, /SUPABASE_URL="https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co"/);
  assert.match(bootstrapSource, /SUPABASE_KEY="sb_publishable_hPlMCyy51TS4c67V7WkkIw_p1Mv2Nze"/);
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_URL=https:\/\/aznfyazjndfniwsocdka\.supabase\.co/
  );
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_Z8egrB_x2ya7eNQCN8qcOw_Sxhmmt2O/
  );
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_URL=https:\/\/rjebeugdvwbjpaktrrbx\.supabase\.co/
  );
  assert.match(
    mobileBuildSource,
    /EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_hPlMCyy51TS4c67V7WkkIw_p1Mv2Nze/
  );
});
