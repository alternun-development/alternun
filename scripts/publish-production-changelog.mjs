#!/usr/bin/env node
/**
 * Publishes the end-user changelog block for a promoted release.
 *
 * The branch-aware versioning tool emits dev-to-production comparison blocks.
 * This script replaces those duplicates with one block that compares the last
 * production tag to the promoted production version.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'CHANGELOG.md');

const SECTION_BY_TYPE = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance',
  docs: 'Documentation',
  refactor: 'Refactoring',
  security: 'Security',
};

function runGit(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });

  if ((result.status ?? 1) !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }

  return result.stdout.trim();
}

function parseArgs(argv) {
  const versionIndex = argv.indexOf('--version');
  const version = versionIndex === -1 ? null : argv[versionIndex + 1]?.replace(/^v/, '');

  if (!version) {
    throw new Error('Usage: node scripts/publish-production-changelog.mjs --version X.Y.Z');
  }

  return { version };
}

function parseProductionTag(tag) {
  return /^v\d+\.\d+\.\d+$/.test(tag);
}

function getPreviousProductionTag(version) {
  const currentTag = `v${version}`;
  const tags = runGit(['tag', '--merged', 'HEAD', '--sort=-v:refname']).split('\n').filter(Boolean);
  const previous = tags.find((tag) => parseProductionTag(tag) && tag !== currentTag);

  if (!previous) {
    throw new Error(`Unable to find a production tag preceding ${currentTag}`);
  }

  return previous;
}

function getRepositoryUrl() {
  const remote = runGit(['remote', 'get-url', 'origin']).replace(/\.git$/, '');

  if (remote.startsWith('git@github.com:')) {
    return `https://github.com/${remote.slice('git@github.com:'.length)}`;
  }

  return remote;
}

function isReleaseHousekeeping(subject) {
  return subject.startsWith('chore: release ') || subject.startsWith('Revert "chore: release ');
}

function formatCommit(subject, hash, repositoryUrl) {
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?:\s+(.+)$/);
  const type = match?.[1] ?? 'chore';
  const scope = match?.[2] ?? 'repo';
  const message = match?.[3] ?? subject;
  const section = SECTION_BY_TYPE[type] ?? 'Changes';

  return {
    section,
    line: `- **${scope}:** ${message} ([${hash.slice(0, 7)}](${repositoryUrl}/commit/${hash}))`,
  };
}

export function renderProductionChangelogBlock({
  version,
  previousTag,
  date,
  repositoryUrl,
  commits,
}) {
  const sections = new Map();

  for (const commit of commits) {
    if (isReleaseHousekeeping(commit.subject)) continue;

    const formatted = formatCommit(commit.subject, commit.hash, repositoryUrl);
    const entries = sections.get(formatted.section) ?? [];
    entries.push(formatted.line);
    sections.set(formatted.section, entries);
  }

  if (sections.size === 0) {
    sections.set('Changes', ['- **repo:** Internal release maintenance.']);
  }

  const body = Array.from(
    sections,
    ([section, entries]) => `### ${section}\n\n${entries.join('\n')}`
  ).join('\n\n');

  return `## [${version}](${repositoryUrl}/compare/${previousTag}...v${version}) (${date})\n\n${body}`;
}

export function replaceVersionBlocks(raw, version, replacement) {
  const blocks = raw.split(/(?=^## \[)/m).filter((block) => block.trim().length > 0);
  const retained = blocks.filter((block) => !block.startsWith(`## [${version}]`));

  return `${[replacement, ...retained.map((block) => block.trim())].join('\n\n')}\n`;
}

function main() {
  const { version } = parseArgs(process.argv.slice(2));
  const previousTag = getPreviousProductionTag(version);
  const repositoryUrl = getRepositoryUrl();
  const date = runGit(['show', '-s', '--format=%cs', 'HEAD']);
  const commits = runGit(['log', '--no-merges', '--format=%H%x09%s', `${previousTag}..HEAD`])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject] = line.split('\t', 2);
      return { hash, subject };
    });
  const block = renderProductionChangelogBlock({
    version,
    previousTag,
    date,
    repositoryUrl,
    commits,
  });
  const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');

  fs.writeFileSync(CHANGELOG_PATH, replaceVersionBlocks(changelog, version, block), 'utf8');
  console.log(
    `Published production changelog block for v${version} (${previousTag}...v${version}).`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
