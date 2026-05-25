import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const releaseScriptPath = path.join(repoRoot, 'scripts', 'release.mjs');

void test('release patch stays wired to the release script and auto deploys testnet', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const releaseSource = fs.readFileSync(releaseScriptPath, 'utf8');

  assert.equal(packageJson.scripts['release:patch'], 'node scripts/release.mjs patch');
  assert.match(releaseSource, /deploy-testnet-api\.sh/);
  assert.match(releaseSource, /--no-prompt/);
  assert.match(releaseSource, /pnpm release:patch/);
  assert.match(releaseSource, /function resolveGitHubRepoSlug/);
  assert.match(releaseSource, /gh api repos\/\$\{repoSlug\}\/pulls/);
  assert.match(releaseSource, /gh api PATCH failed/);
  assert.doesNotMatch(releaseSource, /gh pr edit/);
  assert.doesNotMatch(releaseSource, /gh pr create/);
});
