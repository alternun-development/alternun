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

function loadMobileEnv() {
  const mobileRoot = path.resolve(__dirname, '..');
  const env = {};

  loadDotEnvFile(path.join(mobileRoot, '.env'), env);
  loadDotEnvFile(path.join(mobileRoot, '.env.local'), env);

  return env;
}

function readEnvValue(env, fileEnv, keys, fallback) {
  for (const key of keys) {
    const shellValue = env[key];
    if (typeof shellValue === 'string' && shellValue.trim()) {
      return shellValue.trim();
    }

    const fileValue = fileEnv[key];
    if (typeof fileValue === 'string' && fileValue.trim()) {
      return fileValue.trim();
    }
  }

  return fallback;
}

function resolveMobileAuthExecutionProvider(env = process.env) {
  const fileEnv = loadMobileEnv();
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

  const betterAuthUrl = readEnvValue(
    env,
    fileEnv,
    ['EXPO_PUBLIC_BETTER_AUTH_URL', 'AUTH_BETTER_AUTH_URL'],
    ''
  );

  return betterAuthUrl ? 'better-auth' : 'supabase';
}

function resolveMobilePublicAuthEnv(env = process.env) {
  const fileEnv = loadMobileEnv();

  return {
    executionProvider: resolveMobileAuthExecutionProvider(env),
    publicExecutionProvider: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER', 'AUTH_EXECUTION_PROVIDER'],
      ''
    ),
    publicBetterAuthUrl: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_BETTER_AUTH_URL', 'AUTH_BETTER_AUTH_URL'],
      ''
    ),
    publicAuthExchangeUrl: readEnvValue(
      env,
      fileEnv,
      ['EXPO_PUBLIC_AUTH_EXCHANGE_URL', 'AUTH_EXCHANGE_URL'],
      ''
    ),
  };
}

function main() {
  const command = process.argv[2];

  if (command === 'auth-execution-provider') {
    process.stdout.write(resolveMobileAuthExecutionProvider());
    return;
  }

  process.stdout.write(
    [
      'Usage:',
      '  node ./scripts/mobile-env.cjs auth-execution-provider',
    ].join('\n')
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  loadDotEnvFile,
  loadMobileEnv,
  readEnvValue,
  resolveMobileAuthExecutionProvider,
  resolveMobilePublicAuthEnv,
};
