#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  REPO_ROOT,
  readRootVersion,
  setRootVersion,
  syncSupplementalVersionFiles,
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
const forwardedArgs = stripOption(rawArgs, ['--version', '-v']);
const originalVersion = readRootVersion();

if (requestedVersion && requestedVersion !== originalVersion) {
  setRootVersion(requestedVersion);
}

const result = spawnSync('pnpm', ['exec', 'versioning', 'sync', ...forwardedArgs], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
});

if (result.status !== 0) {
  if (requestedVersion && requestedVersion !== originalVersion) {
    setRootVersion(originalVersion);
  }
  process.exit(result.status ?? 1);
}

const resolvedVersion = requestedVersion || readRootVersion();

const touchedFiles = syncSupplementalVersionFiles(resolvedVersion);
console.log(`Synced supplemental version files to ${resolvedVersion}: ${touchedFiles.join(', ')}`);
