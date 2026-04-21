const { describe, expect, it } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('mobile build script cleanup', () => {
  it('clears previous Expo export artifacts before generating a new web bundle', () => {
    const buildScript = fs.readFileSync(path.resolve(__dirname, '..', 'build.sh'), 'utf8');

    expect(buildScript).toContain('clear_previous_export_artifacts()');
    expect(buildScript).toContain('rm -rf dist .expo');
    expect(buildScript).toContain('rm -rf node_modules/.cache/expo node_modules/.cache/metro');
    expect(buildScript).toMatch(/clear_previous_export_artifacts\(\)[\s\S]*npx expo export -p web/);
  });
});
