#!/usr/bin/env node
/**
 * changelog-auto-fill.mjs
 *
 * Automatically fills empty changelog entries with commit logs.
 * Reuses parsing logic from check-changelog.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'CHANGELOG.md');

function parseArgs(argv) {
  const args = { targetVersion: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--version' && argv[i + 1]) {
      args.targetVersion = argv[++i].replace(/^v/, '');
    }
  }
  return args;
}

function parseChangelog(raw) {
  const entries = [];
  const seen = new Set();
  const blocks = raw.split(/(?=^## \[)/m).filter((b) => /^## \[/.test(b.trimStart()));

  for (const block of blocks) {
    const headerLine = block.split('\n')[0] ?? '';
    const m = headerLine.match(
      /^## \[([^\]]+)\](?:\([^)]+\))?\s*(?:\((\d{4}-\d{2}-\d{2})\)|-\s*(\d{4}-\d{2}-\d{2}))/
    );
    if (!m) continue;

    const version = m[1];
    if (seen.has(version)) continue;
    seen.add(version);

    const date = m[2] ?? m[3] ?? '';
    const hasSection = /^### /m.test(block);
    const hasItem = /^- /m.test(block.replace(/^[^#]*/s, '').replace(/^## .*/m, ''));

    entries.push({
      version,
      date,
      hasContent: hasSection && hasItem,
      rawBlock: block,
    });
  }
  return entries;
}

function runGit(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return result.stdout.trim();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error('changelog-auto-fill: CHANGELOG.md not found.');
    return;
  }

  const raw = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const entries = parseChangelog(raw);
  if (entries.length === 0) {
    console.error('changelog-auto-fill: No parseable entries found.');
    return;
  }

  const target = args.targetVersion
    ? entries.find((e) => e.version === args.targetVersion)
    : entries[0];

  if (!target) {
    console.error(
      `changelog-auto-fill: Target version ${args.targetVersion || 'latest'} not found.`
    );
    return;
  }

  if (!target.hasContent) {
    console.log(`changelog-auto-fill: v${target.version} is empty. Injecting commits...`);

    // Find previous version to get commit range
    const prevEntry = entries.find((e) => e.version !== target.version);
    const range = prevEntry ? `v${prevEntry.version}..HEAD` : 'HEAD';

    const commitLog = runGit(['log', range, '--oneline']);
    if (!commitLog) {
      console.log('changelog-auto-fill: No commits found in range.');
      return;
    }

    const lines = commitLog
      .split('\n')
      .filter((line) => !line.includes(`chore: release v${target.version}`))
      .map((line) => {
        const msg = line.split(' ').slice(1).join(' ');
        return `- ${msg}`;
      });

    if (lines.length === 0) {
      console.log('changelog-auto-fill: No relevant commits found.');
      return;
    }

    const injection = `\n### Miscellaneous\n\n${lines.join('\n')}\n`;

    const oldBlock = target.rawBlock;
    const newBlock = oldBlock.trimEnd() + injection + '\n';

    const newRaw = raw.replace(oldBlock, newBlock);
    fs.writeFileSync(CHANGELOG_PATH, newRaw, 'utf8');
    console.log(`changelog-auto-fill: ✅ Updated v${target.version} with ${lines.length} commits.`);
  } else {
    console.log(`changelog-auto-fill: v${target.version} already has content.`);
  }
}

main();
