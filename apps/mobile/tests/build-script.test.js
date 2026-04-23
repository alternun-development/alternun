const { describe, expect, it } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('mobile build script cleanup', () => {
  it('clears previous Expo export artifacts before generating a new web bundle', () => {
    const buildScript = fs.readFileSync(path.resolve(__dirname, '..', 'build.sh'), 'utf8');
    const devSupabaseKey = ['sb', 'publishable', 'Z8egrB_x2ya7eNQCN8qcOw', 'Sxhmmt2O'].join('_');
    const prodSupabaseKey = ['sb', 'publishable', 'hPlMCyy51TS4c67V7WkkIw', 'p1Mv2Nze'].join('_');

    expect(buildScript).toContain('clear_previous_export_artifacts()');
    expect(buildScript).toContain('stage_supabase_key="${EXPO_PUBLIC_SUPABASE_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}"');
    expect(buildScript).toContain(
      "grep -E '^(export[[:space:]]+)?EXPO_PUBLIC_SUPABASE_(KEY|ANON_KEY)=' ../../.env.local"
    );
    expect(buildScript).toContain(
      'ERROR: EXPO_PUBLIC_SUPABASE_KEY is required for mobile stage'
    );
    expect(buildScript).toContain('EXPO_PUBLIC_SUPABASE_KEY=${stage_supabase_key}');
    expect(buildScript).toContain('rm -rf dist .expo');
    expect(buildScript).not.toContain('rm -rf node_modules/.cache/expo node_modules/.cache/metro');
    expect(buildScript).toMatch(/clear_previous_export_artifacts\(\)[\s\S]*npx expo export -p web/);
    expect(buildScript).toContain('resolve_expected_release_version()');
    expect(buildScript).toContain('verify_exported_web_bundle_version()');
    expect(buildScript).toContain('does not contain expected release version');
    expect(buildScript).toContain('grep -Fq "${expected_version}" "$bundle_path"');
    expect(buildScript).toContain('version.development.json');
    expect(buildScript).toContain('version.production.json');
    expect(buildScript).not.toContain(devSupabaseKey);
    expect(buildScript).not.toContain(prodSupabaseKey);
  });
});
