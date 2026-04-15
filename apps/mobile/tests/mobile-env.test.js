const { describe, expect, it } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  loadMobileEnv,
  loadDotEnvFile,
  resolveMobileAuthExecutionProvider,
} = require('../scripts/mobile-env.cjs');

describe('mobile-env', () => {
  it('resolves the app execution provider from the mobile env files', () => {
    const fileEnv = loadMobileEnv();
    const expected = String(
      fileEnv.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER ??
        fileEnv.AUTH_EXECUTION_PROVIDER ??
        'supabase'
    )
      .trim()
      .toLowerCase();

    expect(resolveMobileAuthExecutionProvider({})).toBe(expected);
  });

  it('prefers shell env over file env', () => {
    expect(
      resolveMobileAuthExecutionProvider({
        EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'supabase',
      })
    ).toBe('supabase');
  });

  it('lets .env.local override .env values', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alternun-mobile-env-'));
    const envPath = path.join(tempDir, '.env');
    const localPath = path.join(tempDir, '.env.local');

    fs.writeFileSync(envPath, 'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase\n');
    fs.writeFileSync(localPath, 'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=better-auth\n');

    const loaded = loadDotEnvFile(localPath, loadDotEnvFile(envPath, {}));
    expect(loaded.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER).toBe('better-auth');
  });
});
