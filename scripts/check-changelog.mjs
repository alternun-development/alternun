#!/usr/bin/env node
/**
 * check-changelog.mjs
 *
 * Guards against empty changelog entries before a release is pushed.
 * Reads CHANGELOG.md and asserts that the most recent version block
 * contains at least one documented change.
 *
 * Exit codes:
 *   0 — changelog is non-empty for the latest version
 *   1 — latest version has no documented changes (empty entry)
 *
 * Usage:
 *   node scripts/check-changelog.mjs
 *   node scripts/check-changelog.mjs --version 1.0.19   # check a specific version
 *   node scripts/check-changelog.mjs --allow-empty      # skip (no-op, for CI overrides)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'CHANGELOG.md');

// ── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { targetVersion: null, allowEmpty: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--version' && argv[i + 1]) {
      args.targetVersion = argv[++i].replace(/^v/, '');
    } else if (argv[i] === '--allow-empty') {
      args.allowEmpty = true;
    }
  }
  return args;
}

// ── Changelog parser ──────────────────────────────────────────────────────────

/**
 * Returns an array of parsed version entries:
 *   { version, date, hasContent, sections }
 * Deduplicates repeated blocks.
 */
function parseChangelog(raw) {
  const entries = [];
  const seen = new Set();

  // Split at every "## [" header boundary
  const blocks = raw.split(/(?=^## \[)/m).filter((b) => /^## \[/.test(b.trimStart()));

  for (const block of blocks) {
    const headerLine = block.split('\n')[0] ?? '';

    // Match:  ## [1.0.18](url) (2026-04-05)  or  ## [1.0.18] - 2026-04-05
    const m = headerLine.match(
      /^## \[([^\]]+)\](?:\([^)]+\))?\s*(?:\((\d{4}-\d{2}-\d{2})\)|-\s*(\d{4}-\d{2}-\d{2}))/
    );
    if (!m) continue;

    const version = m[1];
    if (seen.has(version)) continue;
    seen.add(version);

    const date = m[2] ?? m[3] ?? '';

    // Detect whether any ### section has at least one "- " or "* " item
    const hasSection = /^### /m.test(block);
    const hasItem = /^[-*] /m.test(block.replace(/^[^#]*/s, '').replace(/^## .*/m, ''));

    // Collect sections for richer reporting
    const sections = [];
    const sectionMatches = [...block.matchAll(/^### (.+)$/gm)];
    for (const match of sectionMatches) {
      sections.push(match[1].trim());
    }

    entries.push({
      version,
      date,
      hasContent: hasSection && hasItem,
      sections,
      rawBlock: block,
    });
  }

  return entries;
}

// ── Guard logic ───────────────────────────────────────────────────────────────

function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.allowEmpty) {
    console.log('check-changelog: --allow-empty set, skipping guard.');
    process.exit(0);
  }

  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error('check-changelog: CHANGELOG.md not found at', CHANGELOG_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const entries = parseChangelog(raw);

  if (entries.length === 0) {
    console.error('check-changelog: CHANGELOG.md contains no parseable version entries.');
    process.exit(1);
  }

  // Target a specific version or default to the latest
  let target;
  if (args.targetVersion) {
    target = entries.find((e) => e.version === args.targetVersion);
    if (!target) {
      console.error(`check-changelog: version ${args.targetVersion} not found in CHANGELOG.md.`);
      console.error(
        '  Available versions:',
        entries
          .slice(0, 5)
          .map((e) => e.version)
          .join(', ')
      );
      process.exit(1);
    }
  } else {
    target = entries[0];
  }

  if (!target.hasContent) {
    const tip = [
      '',
      `  check-changelog: ❌  v${target.version} (${target.date}) has no documented changes.`,
      '',
      '  Every released version must contain at least one changelog entry.',
      '  Add a description of what changed before releasing:',
      '',
      `  ## [${target.version}](compare-url) (${target.date})`,
      '',
      '  ### Bug Fixes',
      '  - describe what was fixed',
      '',
      '  Or run with --allow-empty to bypass this guard (CI override only).',
      '',
    ].join('\n');

    console.error(tip);
    process.exit(1);
  }

  const sectionSummary =
    target.sections.length > 0
      ? `  Sections: ${target.sections.join(', ')}`
      : '  (no named sections)';

  console.log(`check-changelog: ✅  v${target.version} (${target.date}) has documented changes.`);
  console.log(sectionSummary);
  process.exit(0);
}

run();
