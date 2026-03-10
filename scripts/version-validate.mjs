#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  REPO_ROOT,
  readRootVersion,
  validateSupplementalVersionFiles,
} = require('./versioning/version-files.cjs');

const forwardedArgs = process.argv.slice(2).filter((value) => value !== '--');
const result = spawnSync('pnpm', ['exec', 'versioning', 'validate', ...forwardedArgs], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const expectedVersion = readRootVersion();
const validation = validateSupplementalVersionFiles(expectedVersion);

if (!validation.valid) {
  console.error('❌ Supplemental version sync issues:');
  for (const issue of validation.issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

console.log(`✅ Supplemental version files are in sync with ${expectedVersion}`);
