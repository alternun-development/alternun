#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildReleaseManifestJson,
  buildReleaseWorkerSource,
  normalizeReleaseVersion,
  RELEASE_MANIFEST_FILENAME,
  RELEASE_WORKER_FILENAME,
} = require('../dist/index.js');

function parseArgs(argv) {
  const args = {
    targetDir: 'public',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--target-dir') {
      args.targetDir = argv[index + 1] ?? args.targetDir;
      index += 1;
      continue;
    }
    if (value.startsWith('--target-dir=')) {
      args.targetDir = value.slice('--target-dir='.length);
    }
  }

  return args;
}

function readPackageVersion() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return normalizeReleaseVersion(packageJson.version);
}

function main() {
  const { targetDir } = parseArgs(process.argv.slice(2));
  const version = readPackageVersion();
  const resolvedTargetDir = path.resolve(process.cwd(), targetDir);

  fs.mkdirSync(resolvedTargetDir, { recursive: true });

  fs.writeFileSync(
    path.join(resolvedTargetDir, RELEASE_MANIFEST_FILENAME),
    buildReleaseManifestJson(version),
    'utf8'
  );

  fs.writeFileSync(
    path.join(resolvedTargetDir, RELEASE_WORKER_FILENAME),
    `${buildReleaseWorkerSource(version)}\n`,
    'utf8'
  );

  console.log(
    `Generated release assets in ${path.relative(process.cwd(), resolvedTargetDir) || '.'}: ${RELEASE_MANIFEST_FILENAME}, ${RELEASE_WORKER_FILENAME}`
  );
}

try {
  main();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
