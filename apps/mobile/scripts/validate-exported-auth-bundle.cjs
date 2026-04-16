#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  resolveMobilePublicAuthEnv,
} = require('./mobile-env.cjs');

function collectBundleFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectBundleFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }

  return files;
}

function readBundleContents(bundleFiles) {
  return bundleFiles
    .map((filePath) => fs.readFileSync(filePath, 'utf8'))
    .join('\n');
}

function findMatches(bundleContents, patterns) {
  const matches = [];

  for (const pattern of patterns) {
    const match = bundleContents.match(pattern);
    if (match?.[0]) {
      matches.push(match[0]);
    }
  }

  return matches;
}

function validateBetterAuthBundle(bundleContents, publicEnv) {
  const betterAuthProviderPattern = /EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER:"better-auth"/;
  const supabaseProviderPattern = /EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER:"supabase"/;

  if (supabaseProviderPattern.test(bundleContents)) {
    throw new Error(
      [
        'Exported AIRS web bundle still embeds `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER:"supabase"`',
        'while the build expects Better Auth.',
      ].join(' ')
    );
  }

  if (
    !betterAuthProviderPattern.test(bundleContents) &&
    !publicEnv.publicBetterAuthUrl
  ) {
    throw new Error(
      'Better Auth build is missing both the public execution flag and the public Better Auth URL.'
    );
  }

  if (
    publicEnv.publicExecutionProvider &&
    !bundleContents.includes(`EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER:"${publicEnv.publicExecutionProvider}"`) &&
    !publicEnv.publicBetterAuthUrl
  ) {
    throw new Error(
      `Exported AIRS web bundle is missing EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER="${publicEnv.publicExecutionProvider}".`
    );
  }

  if (
    publicEnv.publicBetterAuthUrl &&
    !bundleContents.includes(`EXPO_PUBLIC_BETTER_AUTH_URL:"${publicEnv.publicBetterAuthUrl}"`)
  ) {
    throw new Error(
      `Exported AIRS web bundle is missing EXPO_PUBLIC_BETTER_AUTH_URL="${publicEnv.publicBetterAuthUrl}".`
    );
  }

  if (
    publicEnv.publicAuthExchangeUrl &&
    !bundleContents.includes(
      `EXPO_PUBLIC_AUTH_EXCHANGE_URL:"${publicEnv.publicAuthExchangeUrl}"`
    )
  ) {
    throw new Error(
      `Exported AIRS web bundle is missing EXPO_PUBLIC_AUTH_EXCHANGE_URL="${publicEnv.publicAuthExchangeUrl}".`
    );
  }

  const expectsNonLocalBetterAuthUrl =
    typeof publicEnv.publicBetterAuthUrl === 'string' &&
    publicEnv.publicBetterAuthUrl.length > 0 &&
    !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(publicEnv.publicBetterAuthUrl);

  if (expectsNonLocalBetterAuthUrl) {
    const staleLocalPatterns = [
      /EXPO_PUBLIC_BETTER_AUTH_URL:"http:\/\/localhost:8082\/auth"/g,
      /EXPO_PUBLIC_BETTER_AUTH_URL:"http:\/\/127\.0\.0\.1:8082\/auth"/g,
      /EXPO_PUBLIC_AUTH_EXCHANGE_URL:"http:\/\/localhost:8082\/auth\/exchange"/g,
      /EXPO_PUBLIC_AUTH_EXCHANGE_URL:"http:\/\/127\.0\.0\.1:8082\/auth\/exchange"/g,
    ];
    const staleMatches = findMatches(bundleContents, staleLocalPatterns);

    if (staleMatches.length > 0) {
      throw new Error(
        [
          'Exported AIRS web bundle still contains localhost Better Auth web auth env.',
          ...staleMatches.map((match) => `- ${match}`),
        ].join('\n')
      );
    }
  }
}

function validateLegacyBundle(bundleContents) {
  const driftPatterns = [
    /\/auth\/sign-in\/social/g,
    /\/auth\/sign-in\/email/g,
    /localhost:9083\/auth/g,
    /127\.0\.0\.1:9083\/auth/g,
    /testnet\.api\.alternun\.co\/better-auth/g,
    /authExecutionProvider:"better-auth"/g,
  ];
  const matches = findMatches(bundleContents, driftPatterns);

  if (matches.length === 0) {
    return;
  }

  throw new Error(
    [
      'Exported AIRS web bundle still contains stale Better Auth web auth paths.',
      ...matches.map((match) => `- ${match}`),
    ].join('\n')
  );
}

function validateExportedAuthBundle(options = {}) {
  const distDir =
    options.distDir ?? path.resolve(__dirname, '..', 'dist', '_expo', 'static', 'js', 'web');
  const publicEnv = resolveMobilePublicAuthEnv(options.env);
  const bundleFiles = collectBundleFiles(distDir);

  if (bundleFiles.length === 0) {
    throw new Error(`No exported AIRS web bundle files found under ${distDir}.`);
  }

  const bundleContents = readBundleContents(bundleFiles);

  if (publicEnv.executionProvider === 'better-auth') {
    validateBetterAuthBundle(bundleContents, publicEnv);
    return;
  }

  validateLegacyBundle(bundleContents);
}

function main() {
  try {
    validateExportedAuthBundle();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  collectBundleFiles,
  findMatches,
  validateBetterAuthBundle,
  validateLegacyBundle,
  validateExportedAuthBundle,
};
