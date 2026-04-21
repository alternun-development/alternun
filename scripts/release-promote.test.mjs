import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const releasePromotePath = path.join(repoRoot, 'scripts', 'release-promote.mjs');

void test('release promotion command stays wired to the dedicated wrapper', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const wrapperSource = fs.readFileSync(releasePromotePath, 'utf8');

  assert.equal(packageJson.scripts['release:patch:promote'], 'node scripts/release-promote.mjs');
  assert.equal(packageJson.scripts['release:promote'], 'node scripts/release-promote.mjs');
  assert.match(wrapperSource, /--promote/);
  assert.match(wrapperSource, /pnpm release:patch:promote/);
});
