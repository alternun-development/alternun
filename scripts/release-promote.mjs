#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2).filter((value) => value !== '--');

function printUsage() {
  console.log(`Usage:
  pnpm release:patch:promote [options]

This is a thin wrapper around \`node scripts/release.mjs --promote\`.
It promotes the current develop release to the production branch and opens or updates
the develop -> master/main PR.
`);
}

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const result = spawnSync(process.execPath, [path.join(__dirname, 'release.mjs'), '--promote', ...args], {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
