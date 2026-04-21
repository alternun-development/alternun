#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  captureFileContents,
  REPO_ROOT,
  SUPPLEMENTAL_VERSION_FILES,
  getCurrentBranch,
  getManagedPackageJsonPaths,
  readRootVersion,
  resolveBranchRule,
  setRootVersion,
  syncBranchVersionManifests,
  syncSupplementalVersionFiles,
  restoreFileContents,
  stripVersionSuffix,
} = require('./versioning/version-files.cjs');

function getOptionValue(args, names) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    for (const name of names) {
      if (value === name) {
        return args[index + 1] ?? null;
      }

      if (value.startsWith(`${name}=`)) {
        return value.slice(name.length + 1);
      }
    }
  }

  return null;
}

function stripOption(args, names) {
  const strippedArgs = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    let matched = false;

    for (const name of names) {
      if (value === name) {
        matched = true;
        index += 1;
        break;
      }

      if (value.startsWith(`${name}=`)) {
        matched = true;
        break;
      }
    }

    if (!matched) {
      strippedArgs.push(value);
    }
  }

  return strippedArgs;
}

const rawArgs = process.argv.slice(2).filter((value) => value !== '--');
const requestedVersion = getOptionValue(rawArgs, ['--version', '-v']);
const targetBranch = getOptionValue(rawArgs, ['--target-branch']);
const forwardedArgs = stripOption(rawArgs, ['--version', '-v']);
const branchArgs = stripOption(forwardedArgs, ['--target-branch']);
const branch = getCurrentBranch();
const syncBranch = targetBranch || branch;
const branchRule = resolveBranchRule(syncBranch);
const originalSyncVersion = readRootVersion(syncBranch);
const requestedSyncVersion = requestedVersion || originalSyncVersion;
const resolvedVersion =
  branchRule.resolvedConfig?.environment === 'production'
    ? stripVersionSuffix(requestedSyncVersion)
    : requestedSyncVersion;
const syncVersion = stripVersionSuffix(resolvedVersion);
const trackedPaths = [
  ...new Set([
    ...getManagedPackageJsonPaths(syncBranch),
    'version.development.json',
    'version.production.json',
    ...SUPPLEMENTAL_VERSION_FILES.map((entry) => entry.relativePath),
  ]),
];
const snapshot = captureFileContents(trackedPaths);

if (requestedVersion && resolvedVersion !== originalSyncVersion) {
  setRootVersion(resolvedVersion, syncBranch);
}

let result;

try {
  result = spawnSync(
    'pnpm',
    ['exec', 'versioning', 'sync', '--version', syncVersion, ...branchArgs],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        ALTERNUN_VERSION_BRANCH: syncBranch,
      },
      stdio: 'inherit',
    }
  );

  if (result.status !== 0) {
    throw new Error(`versioning sync failed with status ${result.status ?? 1}`);
  }
  syncBranchVersionManifests(resolvedVersion, syncBranch);
  const touchedFiles = syncSupplementalVersionFiles(resolvedVersion);
  console.log(`Synced supplemental version files to ${resolvedVersion}: ${touchedFiles.join(', ')}`);
} catch (error) {
  restoreFileContents(snapshot);
  if (requestedVersion && resolvedVersion !== originalSyncVersion) {
    setRootVersion(originalSyncVersion, syncBranch);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
