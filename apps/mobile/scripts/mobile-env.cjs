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

function resolveMobileAuthExecutionProvider(env = process.env) {
  const fileEnv = loadMobileEnv();
  const value =
    env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER ??
    env.AUTH_EXECUTION_PROVIDER ??
    fileEnv.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER ??
    fileEnv.AUTH_EXECUTION_PROVIDER ??
    'supabase';

  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : 'supabase';
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
  resolveMobileAuthExecutionProvider,
};
