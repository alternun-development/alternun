#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  REPO_ROOT,
  SUPPLEMENTAL_VERSION_FILES,
  getManagedPackageJsonPaths,
  readRootVersion,
  syncSupplementalVersionFiles,
} = require('./versioning/version-files.cjs');

const VALID_BUMPS = new Set(['patch', 'minor', 'major']);

function printUsage() {
  console.log(`Usage:
  pnpm release <patch|minor|major>
  pnpm release <version>
  pnpm release --promote

Options:
  --promote       Push and promote the current release using the active branch policy.
  --remote <name> Git remote to use. Defaults to origin.
  --no-tag        Do not create an annotated git tag.
  --no-commit     Do not create a release commit.
  --dry-run       Print commands without changing git state.
  --allow-dirty   Skip the clean-working-tree guard.
  --help          Show this help text.
`);
}

function parseArgs(argv) {
  const options = {
    promote: false,
    remote: 'origin',
    createTag: true,
    createCommit: true,
    dryRun: false,
    allowDirty: false,
  };
  let target = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--help' || value === '-h') {
      printUsage();
      process.exit(0);
    }

    if (value === '--promote') {
      options.promote = true;
      continue;
    }

    if (value === '--no-tag') {
      options.createTag = false;
      continue;
    }

    if (value === '--no-commit') {
      options.createCommit = false;
      continue;
    }

    if (value === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (value === '--allow-dirty') {
      options.allowDirty = true;
      continue;
    }

    if (value === '--remote') {
      options.remote = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (value.startsWith('--remote=')) {
      options.remote = value.slice('--remote='.length);
      continue;
    }

    if (value.startsWith('-')) {
      throw new Error(`Unknown option: ${value}`);
    }

    if (target !== null) {
      throw new Error(`Unexpected argument: ${value}`);
    }

    target = value;
  }

  if (!target && !options.promote) {
    throw new Error('Provide a release type/version or use --promote.');
  }

  if (!options.createCommit && options.createTag) {
    throw new Error('--no-commit requires --no-tag.');
  }

  if (!options.createCommit && options.promote) {
    throw new Error('--promote requires a committed release.');
  }

  if (!options.remote) {
    throw new Error('A git remote name is required.');
  }

  return { options, target };
}

function run(command, args, { dryRun = false, env = process.env, capture = false } = {}) {
  const rendered = [command, ...args].join(' ');

  if (dryRun) {
    console.log(`[dry-run] ${rendered}`);
    return { status: 0, stdout: '', stderr: '' };
  }

  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    env,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: capture ? 'utf8' : undefined,
  });

  if ((result.status ?? 1) !== 0) {
    if (capture) {
      if (result.stdout) {
        process.stdout.write(result.stdout);
      }
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    }

    throw new Error(`Command failed: ${rendered}`);
  }

  return result;
}

function readTestnetMode() {
  const envPath = path.join(REPO_ROOT, '.env');

  if (!fs.existsSync(envPath)) {
    return 'on';
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^ALTERNUN_TESTNET_MODE=(.+)$/m);

  if (!match) {
    return 'on';
  }

  return match[1].replace(/["'\s]/g, '').toLowerCase();
}

function isTestnetModeEnabled() {
  return ['on', 'true', '1', 'yes'].includes(readTestnetMode());
}

function getCurrentBranch() {
  return run('git', ['branch', '--show-current'], { capture: true }).stdout.trim();
}

function ensureCleanWorkingTree(options) {
  if (options.allowDirty) {
    return;
  }

  const status = run('git', ['status', '--porcelain'], { capture: true }).stdout.trim();
  if (status.length > 0) {
    throw new Error('Working tree is not clean. Commit or stash changes before running the release flow.');
  }
}

function resolveProductionBranch() {
  const refs = run('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads'], { capture: true }).stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (refs.includes('master')) {
    return 'master';
  }

  if (refs.includes('main')) {
    return 'main';
  }

  throw new Error('Neither master nor main exists locally.');
}

function ensureValidVersion(version) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
}

function stageReleaseFiles(dryRun) {
  const managedPaths = new Set([
    ...getManagedPackageJsonPaths(),
    ...SUPPLEMENTAL_VERSION_FILES.map((entry) => entry.relativePath),
  ]);

  const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    managedPaths.add('CHANGELOG.md');
  }

  const existingPaths = [...managedPaths].filter((relativePath) => fs.existsSync(path.join(REPO_ROOT, relativePath)));
  run('git', ['add', '--', ...existingPaths], { dryRun });
}

function createReleaseCommit(version, dryRun) {
  stageReleaseFiles(dryRun);
  run('git', ['commit', '-m', `chore: release v${version}`], { dryRun });
}

function createReleaseTag(version, dryRun) {
  run('git', ['tag', '-a', `v${version}`, '-m', `Release v${version}`], { dryRun });
}

function buildCompareUrl(remoteUrl, base, head) {
  const normalized = remoteUrl.replace(/\.git$/, '');

  if (normalized.startsWith('git@github.com:')) {
    return `https://github.com/${normalized.slice('git@github.com:'.length)}/compare/${base}...${head}?expand=1`;
  }

  if (normalized.startsWith('https://github.com/')) {
    return `${normalized}/compare/${base}...${head}?expand=1`;
  }

  return null;
}

function maybeCreatePullRequest({ remote, base, head, version, dryRun }) {
  const remoteUrl = run('git', ['remote', 'get-url', remote], { capture: true }).stdout.trim();
  const compareUrl = buildCompareUrl(remoteUrl, base, head);
  const title = `chore: release v${version}`;
  const body = [
    `Release promotion for v${version}.`,
    '',
    `- Source branch: ${head}`,
    `- Target branch: ${base}`,
  ].join('\n');

  if (dryRun) {
    console.log(`[dry-run] gh pr create --base ${base} --head ${head} --title \"${title}\"`);
    if (compareUrl) {
      console.log(`[dry-run] PR URL: ${compareUrl}`);
    }
    return;
  }

  const probe = spawnSync('gh', ['--version'], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });

  if (probe.status !== 0) {
    if (compareUrl) {
      console.warn(`gh is not available. Create the PR manually: ${compareUrl}`);
      return;
    }

    console.warn('gh is not available. Create the release PR manually.');
    return;
  }

  const result = spawnSync('gh', ['pr', 'create', '--base', base, '--head', head, '--title', title, '--body', body], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if ((result.status ?? 1) === 0) {
    const output = result.stdout.trim();
    if (output.length > 0) {
      console.log(output);
    }
    return;
  }

  if (compareUrl) {
    console.warn(`gh pr create failed. Create the PR manually: ${compareUrl}`);
    return;
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  console.warn('gh pr create failed. Create the release PR manually.');
}

function promoteRelease({ version, remote, dryRun, productionBranch }) {
  const currentBranch = getCurrentBranch();

  if (isTestnetModeEnabled()) {
    if (currentBranch !== productionBranch) {
      throw new Error(`ALTERNUN_TESTNET_MODE=on requires promotion from ${productionBranch}. Current branch: ${currentBranch}`);
    }

    run('git', ['push', remote, productionBranch, '--follow-tags'], { dryRun });
    run('bash', ['packages/infra/scripts/sync-master-develop.sh'], {
      dryRun,
      env: {
        ...process.env,
        REMOTE: remote,
        SOURCE_BRANCH: productionBranch,
        TARGET_BRANCH: 'develop',
        RETURN_BRANCH: productionBranch,
      },
    });
    console.log(`Promoted v${version}: pushed ${productionBranch} and fast-forwarded develop.`);
    return;
  }

  if (currentBranch !== 'develop') {
    throw new Error(`ALTERNUN_TESTNET_MODE=off requires promotion from develop. Current branch: ${currentBranch}`);
  }

  run('git', ['push', remote, 'develop', '--follow-tags'], { dryRun });
  maybeCreatePullRequest({
    remote,
    base: productionBranch,
    head: 'develop',
    version,
    dryRun,
  });
  console.log(`Promoted v${version}: pushed develop and prepared a PR into ${productionBranch}.`);
}

function performVersionChange(target, options) {
  if (!target) {
    return readRootVersion();
  }

  if (VALID_BUMPS.has(target)) {
    run('pnpm', ['exec', 'versioning', target, '--no-commit', '--no-tag'], { dryRun: options.dryRun });
    const version = options.dryRun ? readRootVersion() : readRootVersion();
    if (!options.dryRun) {
      syncSupplementalVersionFiles(version);
    }
    return version;
  }

  ensureValidVersion(target);
  run('node', ['scripts/version-sync.mjs', '--version', target], { dryRun: options.dryRun });
  run('pnpm', ['exec', 'versioning', 'changelog'], { dryRun: options.dryRun });

  if (!options.dryRun) {
    syncSupplementalVersionFiles(target);
  }

  return options.dryRun ? target : readRootVersion();
}

function main() {
  const { options, target } = parseArgs(process.argv.slice(2).filter((value) => value !== '--'));
  ensureCleanWorkingTree(options);

  const productionBranch = resolveProductionBranch();
  const version = performVersionChange(target, options);

  if (target && options.createCommit) {
    createReleaseCommit(version, options.dryRun);
  }

  if (target && options.createTag) {
    createReleaseTag(version, options.dryRun);
  }

  if (options.promote) {
    promoteRelease({
      version,
      remote: options.remote,
      dryRun: options.dryRun,
      productionBranch,
    });
  }

  if (target) {
    console.log(`Release prepared for v${version}.`);
  }
}

try {
  main();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
