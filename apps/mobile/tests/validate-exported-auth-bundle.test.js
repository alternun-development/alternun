const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, expect, it } = require('@jest/globals');
const {
  validateExportedAuthBundle,
} = require('../scripts/validate-exported-auth-bundle.cjs');

function createBundleDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alternun-auth-bundle-'));

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }

  return dir;
}

describe('validate-exported-auth-bundle', () => {
  it('accepts a better-auth bundle when the public auth env is embedded', () => {
    const bundleDir = createBundleDir({
      'entry.js':
        'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER:"better-auth";' +
        'EXPO_PUBLIC_BETTER_AUTH_URL:"https://testnet.api.alternun.co";' +
        'EXPO_PUBLIC_AUTH_EXCHANGE_URL:"https://testnet.api.alternun.co/auth/exchange";',
    });

    expect(() =>
      validateExportedAuthBundle({
        distDir: bundleDir,
        env: {
          EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
          EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
          EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
        },
      })
    ).not.toThrow();
  });

  it('accepts a better-auth bundle when the runtime infers the provider from the Better Auth url', () => {
    const bundleDir = createBundleDir({
      'entry.js':
        'EXPO_PUBLIC_BETTER_AUTH_URL:"https://testnet.api.alternun.co";' +
        'EXPO_PUBLIC_AUTH_EXCHANGE_URL:"https://testnet.api.alternun.co/auth/exchange";',
    });

    expect(() =>
      validateExportedAuthBundle({
        distDir: bundleDir,
        env: {
          EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
          EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
        },
      })
    ).not.toThrow();
  });

  it('fails a better-auth bundle that still embeds the supabase execution flag', () => {
    const bundleDir = createBundleDir({
      'entry.js':
        'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER:"supabase";' +
        'EXPO_PUBLIC_BETTER_AUTH_URL:"";',
    });

    expect(() =>
      validateExportedAuthBundle({
        distDir: bundleDir,
        env: {
          EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
          EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
        },
      })
    ).toThrow(/supabase/);
  });

  it('fails a better-auth bundle that still embeds localhost Better Auth urls', () => {
    const bundleDir = createBundleDir({
      'entry.js':
        'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER:"better-auth";' +
        'EXPO_PUBLIC_BETTER_AUTH_URL:"https://testnet.api.alternun.co";' +
        'EXPO_PUBLIC_AUTH_EXCHANGE_URL:"https://testnet.api.alternun.co/auth/exchange";' +
        'EXPO_PUBLIC_BETTER_AUTH_URL:"http://localhost:8082/auth";' +
        'EXPO_PUBLIC_AUTH_EXCHANGE_URL:"http://localhost:8082/auth/exchange";',
    });

    expect(() =>
      validateExportedAuthBundle({
        distDir: bundleDir,
        env: {
          EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
          EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
          EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
        },
      })
    ).toThrow(/localhost Better Auth web auth env/);
  });

  it('fails a legacy bundle that still ships Better Auth web endpoints', () => {
    const bundleDir = createBundleDir({
      'entry.js': 'fetch("/auth/sign-in/social"); authExecutionProvider:"better-auth";',
    });

    expect(() =>
      validateExportedAuthBundle({
        distDir: bundleDir,
        env: {
          EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'supabase',
        },
      })
    ).toThrow(/stale Better Auth web auth paths/);
  });
});
