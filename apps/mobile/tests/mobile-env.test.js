const { describe, expect, it } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  loadMobileEnv,
  loadDotEnvFile,
  resolveFileEnv,
  resolveMobileAuthExecutionProvider,
  resolveMobileBuildAuthEnv,
  resolveMobilePublicAuthEnv,
  shouldDisableExpoDotenv,
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

  it('infers better-auth from the public Better Auth url when the flag is missing', () => {
    expect(
      resolveMobileAuthExecutionProvider({
        EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
      })
    ).toBe('better-auth');
  });

  it('infers better-auth from the public auth exchange url when the Better Auth url is missing', () => {
    expect(
      resolveMobileAuthExecutionProvider(
        {
          EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
        },
        { fileEnv: {} }
      )
    ).toBe('better-auth');
  });

  it('resolves the public auth env with shell precedence', () => {
    expect(
      resolveMobilePublicAuthEnv({
        EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
        EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
        EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      })
    ).toMatchObject({
      executionProvider: 'better-auth',
      publicExecutionProvider: 'better-auth',
      publicBetterAuthUrl: 'https://testnet.api.alternun.co',
      publicAuthExchangeUrl: 'https://testnet.api.alternun.co/auth/exchange',
      authentikSocialLoginMode: 'supabase',
    });
  });

  it('derives the public Better Auth url from the auth exchange url when the explicit Better Auth url is missing', () => {
    expect(
      resolveMobilePublicAuthEnv(
        {
          EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
        },
        { fileEnv: {} }
      )
    ).toMatchObject({
      executionProvider: 'better-auth',
      publicBetterAuthUrl: 'https://testnet.api.alternun.co',
      publicAuthExchangeUrl: 'https://testnet.api.alternun.co/auth/exchange',
    });
  });

  it('disables Expo dotenv when deploy-time auth env is already provided by the shell', () => {
    expect(
      shouldDisableExpoDotenv({
        EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
      })
    ).toBe(true);
  });

  it('keeps Expo dotenv enabled when the shell does not provide deploy-time auth env', () => {
    expect(shouldDisableExpoDotenv({})).toBe(false);
  });

  it('keeps stage-specific mobile auth env ahead of infra defaults during deploy-style builds', () => {
    const env = { SST_STAGE: 'dev' };
    const fileEnv = {
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'supabase',
    };
    const infraEnv = {
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
    };

    expect(resolveFileEnv(env, { fileEnv, infraEnv })).toEqual({
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'supabase',
    });
    const publicEnv = resolveMobilePublicAuthEnv(env, { fileEnv, infraEnv });
    expect(publicEnv.publicExecutionProvider).toBe('better-auth');
    expect(publicEnv.publicBetterAuthUrl).toBe('https://testnet.api.alternun.co/auth');
    expect(publicEnv.authentikSocialLoginMode).toBe('supabase');
    expect(shouldDisableExpoDotenv(env, { infraEnv })).toBe(true);
  });

  it('treats dashboard-dev as the testnet deploy stage instead of falling back to localhost', () => {
    expect(
      resolveMobileBuildAuthEnv({
        STACK: 'dashboard-dev',
      })
    ).toMatchObject({
      AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      AUTH_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
    });
  });

  it('treats Expo stage markers as deploy-style builds without overriding explicit mobile auth values', () => {
    const env = { EXPO_PUBLIC_STAGE: 'dev' };
    const fileEnv = {
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
    };
    const infraEnv = {
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
    };

    expect(resolveFileEnv(env, { fileEnv, infraEnv })).toEqual({
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
    });
  });

  it('build auth env keeps stage-specific Better Auth and social mode values', () => {
    const env = { STACK: 'dev' };
    const fileEnv = {
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'supabase',
      EXPO_PUBLIC_AUTHENTIK_ISSUER: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
      EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: 'alternun-mobile',
    };
    const infraEnv = {
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'authentik',
    };

    expect(resolveMobileBuildAuthEnv(env, { fileEnv, infraEnv })).toEqual({
      AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
      AUTH_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
      AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTH_EXCHANGE_URL: 'https://testnet.api.alternun.co/auth/exchange',
      EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: 'supabase',
      EXPO_PUBLIC_AUTHENTIK_ISSUER:
        'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
      EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: 'alternun-mobile',
    });
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
