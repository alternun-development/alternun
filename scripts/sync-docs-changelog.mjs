#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'CHANGELOG.md');
const targetPath = path.join(repoRoot, 'apps/docs/static/CHANGELOG.md');

try {
  const content = fs.readFileSync(sourcePath, 'utf8');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`✅ Synced docs changelog: ${path.relative(repoRoot, targetPath)}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Failed to sync docs changelog: ${message}`);
  process.exit(1);
}
