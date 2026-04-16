#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function normalizeEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadDotEnvFile(filePath, target = {}) {
  if (!fs.existsSync(filePath)) {
    return target;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(trimmed.slice(separatorIndex + 1));

    target[key] = value;
  }

  return target;
}

function loadMobileEnv(mobileRoot = path.resolve(__dirname, '..'), envVars = process.env) {
  const env = {};

  loadDotEnvFile(path.join(mobileRoot, '.env'), env);

  // Load stage-specific environment file if deploying
  // Priority: .env.testnet/.env.development/.env.production → .env.local → shell env
  const stage = envVars.SST_STAGE || envVars.STACK || envVars.EXPO_PUBLIC_STAGE || envVars.EXPO_PUBLIC_ENV;
  if (stage) {
    const stageNormalized = stage.toLowerCase();
    let stageFile = '';

    if (stageNormalized === 'dev' || stageNormalized === 'api-dev' || stageNormalized.includes('testnet') || stageNormalized.includes('development')) {
      stageFile = '.env.development';
    } else if (stageNormalized === 'prod' || stageNormalized === 'api-prod' || stageNormalized === 'production' || stageNormalized.includes('production')) {
      stageFile = '.env.production';
    }

    if (stageFile) {
      loadDotEnvFile(path.join(mobileRoot, stageFile), env);
    }
  }

  loadDotEnvFile(path.join(mobileRoot, '.env.local'), env);

  return env;
}

function loadInfraEnv(repoRoot = path.resolve(__dirname, '..', '..', '..')) {
  const env = {};
  loadDotEnvFile(path.join(repoRoot, 'packages', 'infra', '.env'), env);
  return env;
}

function shouldUseInfraEnvFallback(env = process.env) {
  return [
    'SST_STAGE',
    'STACK',
    'EXPO_PUBLIC_STAGE',
    'EXPO_PUBLIC_ENV',
    'INFRA_ROOT_DOMAIN',
    'DOMAIN_ROOT',
    'INFRA_PIPELINE_PROFILE',
    'APPROVE',
  ].some((key) => {
    const value = env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function resolveFileEnv(env = process.env, options = {}) {
  const fileEnv = options.fileEnv ?? loadMobileEnv(options.mobileRoot, env);
  const useInfraEnvFallback =
    options.useInfraEnvFallback ?? shouldUseInfraEnvFallback(env);

  if (!useInfraEnvFallback) {
    return fileEnv;
  }

  const infraEnv = options.infraEnv ?? loadInfraEnv(options.repoRoot);
  return {
    ...infraEnv,
    ...fileEnv,
  };
}

function readEnvValue(env, fileEnv, keys, fallback) {
  for (const key of keys) {
    const shellValue = env[key];
    if (typeof shellValue === 'string' && shellValue.trim()) {
      return shellValue.trim();
    }
  }

  for (const key of keys) {
    const fileValue = fileEnv[key];
    if (typeof fileValue === 'string' && fileValue.trim()) {
      return fileValue.trim();
    }
  }

  return fallback;
}

function normalizeBetterAuthBaseUrl(rawValue) {
  if (typeof rawValue !== 'string') {
    return '';
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(
      trimmed
        .replace(/\/+$/, '')
        .replace(/\/auth\/exchange$/, '')
        .replace(/\/auth$/, '')
    );
    const pathname = url.pathname === '/' ? '' : url.pathname;
    return `${url.origin}${pathname}`.replace(/\/+$/, '');
  } catch {
    return trimmed
      .replace(/\?.*$/, '')
      .replace(/#.*$/, '')
      .replace(/\/+$/, '')
      .replace(/\/auth\/exchange$/, '')
      .replace(/\/auth$/, '');
  }
}

function resolveMobileBetterAuthUrl(env = process.env, options = {}) {
  const fileEnv = resolveFileEnv(env, options);
  const explicitBetterAuthUrl = readEnvValue(
    env,
    fileEnv,
    ['EXPO_PUBLIC_BETTER_AUTH_URL', 'AUTH_BETTER_AUTH_URL'],
    ''
  );
  if (explicitBetterAuthUrl) {
    return explicitBetterAuthUrl;
  }

  return normalizeBetterAuthBaseUrl(
    readEnvValue(env, fileEnv, ['EXPO_PUBLIC_AUTH_EXCHANGE_URL', 'AUTH_EXCHANGE_URL'], '')
  );
}

function resolveMobileAuthExecutionProvider(env = process.env, options = {}) {
  const fileEnv = resolveFileEnv(env, options);
  const value = readEnvValue(
    env,
    fileEnv,
    ['EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER', 'AUTH_EXECUTION_PROVIDER'],
    ''
  );

  const normalized = String(value).trim().toLowerCase();
  if (normalized.length > 0) {
    return normalized;
  }

  const betterAuthUrl = resolveMobileBetterAuthUrl(env, options);

  return betterAuthUrl ? 'better-auth' : 'supabase';
}

function resolveMobilePublicAuthEnv(env = process.env, options = {}) {
  const fileEnv = resolveFileEnv(env, options);
  const publicBetterAuthUrl = resolveMobileBetterAuthUrl(env, options);

  return {
    executionProvider: resolveMobileAuthExecutionProvider(env, options),
    publicExecutionProvider: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER', 'AUTH_EXECUTION_PROVIDER'],
      ''
    ),
    publicBetterAuthUrl,
    publicAuthExchangeUrl: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_AUTH_EXCHANGE_URL', 'AUTH_EXCHANGE_URL'],
      ''
    ),
    authentikSocialLoginMode: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE'],
      ''
    ),
    authentikIssuer: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_AUTHENTIK_ISSUER'],
      ''
    ),
    authentikClientId: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_AUTHENTIK_CLIENT_ID'],
      ''
    ),
  };
}

function resolveMobileBuildAuthEnv(env = process.env, options = {}) {
  const publicEnv = resolveMobilePublicAuthEnv(env, options);
  const executionProvider = publicEnv.executionProvider || publicEnv.publicExecutionProvider || '';
  const publicExecutionProvider =
    publicEnv.publicExecutionProvider || publicEnv.executionProvider || '';
  const betterAuthUrl = publicEnv.publicBetterAuthUrl || '';
  const authExchangeUrl = publicEnv.publicAuthExchangeUrl || '';
  const authentikSocialLoginMode = publicEnv.authentikSocialLoginMode || '';
  const authentikIssuer = publicEnv.authentikIssuer || '';
  const authentikClientId = publicEnv.authentikClientId || '';

  const buildEnv = {
    AUTH_EXECUTION_PROVIDER: executionProvider,
    EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: publicExecutionProvider,
    AUTH_BETTER_AUTH_URL: betterAuthUrl,
    EXPO_PUBLIC_BETTER_AUTH_URL: betterAuthUrl,
    AUTH_EXCHANGE_URL: authExchangeUrl,
    EXPO_PUBLIC_AUTH_EXCHANGE_URL: authExchangeUrl,
  };

  // Only include Authentik env vars if they're set (prevents empty values from overriding .env)
  if (authentikSocialLoginMode) {
    buildEnv.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE = authentikSocialLoginMode;
  }
  if (authentikIssuer) {
    buildEnv.EXPO_PUBLIC_AUTHENTIK_ISSUER = authentikIssuer;
  }
  if (authentikClientId) {
    buildEnv.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID = authentikClientId;
  }

  return buildEnv;
}

function shouldDisableExpoDotenv(env = process.env, options = {}) {
  const shellHasAuthEnv = [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER',
    'AUTH_EXECUTION_PROVIDER',
    'EXPO_PUBLIC_BETTER_AUTH_URL',
    'AUTH_BETTER_AUTH_URL',
    'EXPO_PUBLIC_AUTH_EXCHANGE_URL',
    'AUTH_EXCHANGE_URL',
    'EXPO_PUBLIC_AUTHENTIK_ISSUER',
    'EXPO_PUBLIC_AUTHENTIK_CLIENT_ID',
  ].some((key) => {
    const value = env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  if (shellHasAuthEnv) {
    return true;
  }

  const useInfraEnvFallback =
    options.useInfraEnvFallback ?? shouldUseInfraEnvFallback(env);
  if (!useInfraEnvFallback) {
    return false;
  }

  const infraEnv = options.infraEnv ?? loadInfraEnv(options.repoRoot);
  return [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER',
    'AUTH_EXECUTION_PROVIDER',
    'EXPO_PUBLIC_BETTER_AUTH_URL',
    'AUTH_BETTER_AUTH_URL',
    'EXPO_PUBLIC_AUTH_EXCHANGE_URL',
    'AUTH_EXCHANGE_URL',
    'EXPO_PUBLIC_AUTHENTIK_ISSUER',
    'EXPO_PUBLIC_AUTHENTIK_CLIENT_ID',
  ].some((key) => {
    const value = infraEnv[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function main() {
  const command = process.argv[2];

  if (command === 'auth-execution-provider') {
    process.stdout.write(resolveMobileAuthExecutionProvider());
    return;
  }

  if (command === 'should-disable-dotenv') {
    process.stdout.write(shouldDisableExpoDotenv() ? 'true' : 'false');
    return;
  }

  if (command === 'build-auth-env') {
    const buildEnv = resolveMobileBuildAuthEnv();
    process.stdout.write(
      Object.entries(buildEnv)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')
    );
    return;
  }

  process.stdout.write(
    [
      'Usage:',
      '  node ./scripts/mobile-env.cjs auth-execution-provider',
      '  node ./scripts/mobile-env.cjs should-disable-dotenv',
      '  node ./scripts/mobile-env.cjs build-auth-env',
    ].join('\n')
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  loadDotEnvFile,
  loadMobileEnv,
  loadInfraEnv,
  readEnvValue,
  resolveFileEnv,
  resolveMobileAuthExecutionProvider,
  resolveMobileBuildAuthEnv,
  resolveMobilePublicAuthEnv,
  shouldUseInfraEnvFallback,
  shouldDisableExpoDotenv,
};
