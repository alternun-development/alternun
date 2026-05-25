#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  captureFileContents,
  REPO_ROOT,
  SUPPLEMENTAL_VERSION_FILES,
  incrementDevelopmentBuildVersion,
  incrementDevelopmentSemanticVersion,
  getManagedPackageJsonPaths,
  getRootPackageJsonPath,
  readRootVersion,
  restoreFileContents,
  stripVersionSuffix,
} = require('./versioning/version-files.cjs');

const VALID_BUMPS = new Set(['patch', 'minor', 'major']);
const BUILD_TARGET = 'build';
const IGNORED_WORKTREE_PATHS = new Set([
  'apps/web/.turbo/turbo-build.log',
  'packages/ui/.turbo/turbo-build.log',
]);
const TRACKED_BUILD_OUTPUT_PATHS = ['packages/auth/dist', 'packages/update/dist'];
const PRE_RELEASE_IGNORED_TRACKED_OUTPUT_PREFIXES = TRACKED_BUILD_OUTPUT_PATHS.map(
  (trackedPath) => `${trackedPath}/`
);

function printUsage() {
  console.log(`Usage:
  pnpm release [build|patch|minor|major|<version>]
  pnpm release <version>
  pnpm release --promote

Options:
  --no-push       Skip the default direct push for release targets.
  --target-branch Assert the branch being released. Defaults to the current branch.
  --promote       Promote a committed release from develop into master/main.
  --remote <name> Git remote to use. Defaults to origin.
  --no-tag        Do not create an annotated git tag.
  --no-commit     Do not create a release commit.
  --dry-run       Print commands without changing git state.
  --allow-dirty   Skip the clean-working-tree guard (does not auto-commit).
  --help          Show this help text.

Notes:
  By default, uncommitted tracked changes are automatically staged and committed
  with a generated conventional-commit message before the release starts.
  New untracked source files are also staged unless they look like build artefacts.
  On the normal development release path, pnpm release:patch also deploys the
  live testnet API via ./scripts/deploy-testnet-api.sh --no-prompt.
  Use --allow-dirty to skip this and proceed with a dirty tree (no auto-commit).
`);
}

function parseArgs(argv) {
  const options = {
    promote: false,
    pushMode: 'default',
    targetBranch: null,
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

    if (value === '--no-push') {
      options.pushMode = 'off';
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

    if (value === '--target-branch') {
      options.targetBranch = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (value.startsWith('--remote=')) {
      options.remote = value.slice('--remote='.length);
      continue;
    }

    if (value.startsWith('--target-branch=')) {
      options.targetBranch = value.slice('--target-branch='.length);
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
    target = BUILD_TARGET;
  }

  if (options.promote && target !== null) {
    throw new Error('--promote cannot be combined with a release target.');
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

  if (options.targetBranch !== null && options.targetBranch.length === 0) {
    throw new Error('A target branch name is required.');
  }

  return { options, target };
}

function shouldDirectPush({ target, options }) {
  if (!target) {
    return false;
  }

  if (options.promote) {
    return false;
  }

  return options.pushMode !== 'off';
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

function getCurrentBranch() {
  return run('git', ['branch', '--show-current'], { capture: true }).stdout.trim();
}

function parseStatusPath(line) {
  const rawPath = line.slice(3).trim();

  if (rawPath.includes(' -> ')) {
    return rawPath.split(' -> ').at(-1)?.replace(/\\/g, '/') ?? '';
  }

  return rawPath.replace(/\\/g, '/');
}

function getPendingChanges() {
  return run('git', ['status', '--porcelain'], { capture: true })
    .stdout.split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter((line) => {
      const pathName = parseStatusPath(line);

      if (IGNORED_WORKTREE_PATHS.has(pathName)) {
        return false;
      }

      return !PRE_RELEASE_IGNORED_TRACKED_OUTPUT_PREFIXES.some((prefix) =>
        pathName.startsWith(prefix)
      );
    })
    .map((line) => ({
      xy: line.slice(0, 2).trim(),
      path: parseStatusPath(line),
      untracked: line.startsWith('??'),
    }));
}

const AREA_MAP = [
  ['apps/mobile', 'mobile'],
  ['apps/web', 'web'],
  ['apps/admin', 'admin'],
  ['apps/api', 'api'],
  ['apps/docs', 'docs'],
  ['packages/ui', 'ui'],
  ['packages/auth', 'auth'],
  ['packages/i18n', 'i18n'],
  ['packages/infra', 'infra'],
  ['packages/update', 'update'],
  ['packages/email-templates', 'email'],
  ['scripts', 'scripts'],
];

function resolveAreas(paths) {
  const areas = new Set();
  for (const p of paths) {
    let matched = false;
    for (const [prefix, label] of AREA_MAP) {
      if (p === prefix || p.startsWith(prefix + '/')) {
        areas.add(label);
        matched = true;
        break;
      }
    }
    if (!matched) areas.add('repo');
  }
  return [...areas].slice(0, 3);
}

function resolveCommitType(paths) {
  // New source files → feat; test/spec files → test; config/scripts → chore; else fix
  if (paths.some((p) => /\.(test|spec)\.[jt]sx?$/.test(p))) return 'test';
  if (
    paths.every(
      (p) =>
        p.endsWith('.json') ||
        p.endsWith('.md') ||
        p.startsWith('scripts/') ||
        p.startsWith('.github/')
    )
  )
    return 'chore';
  // If most changes are in component/feature directories, lean towards fix
  return 'fix';
}

function buildAutoCommitMessage(changes) {
  const paths = changes.map((c) => c.path);
  const areas = resolveAreas(paths);
  const type = resolveCommitType(paths);
  const scope = areas.join(',');

  // Build a short summary from the changed file basenames
  const baseNames = [
    ...new Set(
      paths
        .filter((p) => !p.endsWith('.log') && !p.includes('/dist/'))
        .map((p) => path.basename(p, path.extname(p)))
        .filter((n) => n && n !== 'index' && n !== 'package')
        .slice(0, 4)
    ),
  ];

  const summary =
    baseNames.length > 0
      ? baseNames.join(', ')
      : `${paths.length} file${paths.length === 1 ? '' : 's'} updated`;

  return `${type}(${scope}): ${summary}`;
}

function autoCommitPendingChanges(dryRun) {
  const changes = getPendingChanges();
  if (changes.length === 0) return;

  const tracked = changes.filter((c) => !c.untracked);
  const untracked = changes.filter((c) => c.untracked);

  if (tracked.length === 0 && untracked.length === 0) return;

  console.log(`\nDetected ${changes.length} pending change(s) — auto-committing before release:`);
  for (const c of changes.slice(0, 12)) {
    console.log(`  ${c.xy || '??'} ${c.path}`);
  }
  if (changes.length > 12) {
    console.log(`  ... and ${changes.length - 12} more`);
  }

  const message = buildAutoCommitMessage(changes);
  console.log(`\nCommit message: "${message}"\n`);

  // Stage tracked modifications and deletions
  if (tracked.length > 0) {
    run('git', ['add', '-u'], { dryRun });
  }

  // Stage new untracked files that are not obviously generated
  const stagedUntracked = untracked.filter(
    (c) =>
      !c.path.endsWith('.log') &&
      !c.path.includes('node_modules/') &&
      !c.path.includes('/dist/') &&
      !c.path.includes('/.turbo/')
  );
  if (stagedUntracked.length > 0) {
    run('git', ['add', '--', ...stagedUntracked.map((c) => c.path)], { dryRun });
  }

  run('git', ['commit', '-m', message], { dryRun });
  console.log('✓ Pending changes committed.\n');
}

function ensureCleanWorkingTree(options) {
  if (options.allowDirty) {
    return;
  }

  const changes = getPendingChanges();
  if (changes.length > 0) {
    throw new Error(
      'Working tree is not clean. Commit or stash changes before running the release flow.'
    );
  }
}

function validateRootDocumentation() {
  // Guard: Ensure non-critical .md files are archived in docs/
  const result = spawnSync('bash', ['scripts/validate-root-docs.sh', 'false'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(
      'Root documentation structure validation failed. ' +
        'Move non-critical .md files to docs/ before releasing.'
    );
  }
}

function validateAwsAccount() {
  // Guard: Ensure we're using Alternun's AWS account, not the default
  const result = spawnSync('bash', ['scripts/validate-aws-account.sh', 'enforce'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(
      'AWS account validation failed. ' +
        'You must use the Alternun AWS account, not the default. ' +
        'Run: bash scripts/setup-aws-account.sh'
    );
  }
}

function resolveProductionBranch() {
  const refs = run('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads'], {
    capture: true,
  })
    .stdout.split('\n')
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

function ensureChangelogFile(dryRun) {
  const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');

  if (fs.existsSync(changelogPath)) {
    return;
  }

  if (dryRun) {
    console.log('[dry-run] create CHANGELOG.md');
    return;
  }

  fs.writeFileSync(
    changelogPath,
    '# Changelog\n\nAll notable changes to this project will be documented in this file.\n',
    'utf8'
  );
}

function stageReleaseFiles(dryRun, branchName = getCurrentBranch()) {
  const managedPaths = new Set([
    getRootPackageJsonPath(),
    ...getManagedPackageJsonPaths(branchName),
    ...SUPPLEMENTAL_VERSION_FILES.map((entry) => entry.relativePath),
  ]);

  const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    managedPaths.add('CHANGELOG.md');
  }

  for (const trackedBuildOutputPath of TRACKED_BUILD_OUTPUT_PATHS) {
    if (fs.existsSync(path.join(REPO_ROOT, trackedBuildOutputPath))) {
      managedPaths.add(trackedBuildOutputPath);
    }
  }

  const existingPaths = [...managedPaths].filter((relativePath) =>
    fs.existsSync(path.join(REPO_ROOT, relativePath))
  );
  run('git', ['add', '--', ...existingPaths], { dryRun });
}

function resolveReleaseBuildStage(branchName) {
  const normalized = branchName.toLowerCase();

  if (normalized === 'master' || normalized === 'main') {
    return 'production';
  }

  return 'dev';
}

function buildReleaseArtifacts(dryRun, env, buildStage, versionBranch) {
  // Pin the release build stage so the mobile auth bundle resolves the correct
  // stage-specific env instead of drifting back to infra defaults.
  const buildEnv = {
    ...env,
    NODE_ENV: 'production',
    STACK: env.STACK ?? buildStage,
    SST_STAGE: env.SST_STAGE ?? buildStage,
    EXPO_PUBLIC_STAGE: env.EXPO_PUBLIC_STAGE ?? buildStage,
    EXPO_PUBLIC_ENV: env.EXPO_PUBLIC_ENV ?? buildStage,
    ALTERNUN_VERSION_BRANCH: versionBranch,
  };

  // Build the workspace without `@alternun/web` first. The web build performs a
  // second-stage Next export and has proven sensitive to the full concurrent
  // turbo graph, so we run it after the rest of the workspace settles.
  run('pnpm', ['exec', 'turbo', 'run', 'build', '--force', '--filter=!@alternun/web'], {
    dryRun,
    env: buildEnv,
  });

  run('pnpm', ['--filter', '@alternun/web', 'build'], {
    dryRun,
    env: buildEnv,
  });
}

function collectReleaseStatePaths(branchName) {
  return [
    ...new Set([
      getRootPackageJsonPath(),
      ...getManagedPackageJsonPaths(branchName),
      'version.development.json',
      'version.production.json',
      ...SUPPLEMENTAL_VERSION_FILES.map((entry) => entry.relativePath),
      'CHANGELOG.md',
    ]),
  ];
}

function resolveDevelopmentReleaseVersion(target, currentVersion) {
  if (target === BUILD_TARGET) {
    return incrementDevelopmentBuildVersion(currentVersion);
  }

  if (VALID_BUMPS.has(target)) {
    return incrementDevelopmentSemanticVersion(currentVersion, target);
  }

  throw new Error(`Unsupported development release target: ${target}`);
}

function createReleaseCommit(version, dryRun, branchName = getCurrentBranch()) {
  stageReleaseFiles(dryRun, branchName);
  run('git', ['commit', '-m', `chore: release v${version}`], { dryRun });
}

function createReleaseTag(version, dryRun) {
  run('git', ['tag', '-a', `v${version}`, '-m', `Release v${version}`], { dryRun });
}

function pushRelease({ remote, dryRun, targetBranch }) {
  const currentBranch = getCurrentBranch();
  const branchToPush = targetBranch ?? currentBranch;

  if (branchToPush !== currentBranch) {
    throw new Error(
      `Direct release push must use the current branch. Current branch: ${currentBranch}, requested: ${branchToPush}`
    );
  }

  run('git', ['push', remote, branchToPush, '--follow-tags'], { dryRun });
  console.log(`Pushed ${branchToPush} with release tags.`);
}

function deployTestnetApi({ dryRun }) {
  console.log('Deploying testnet API via ./scripts/deploy-testnet-api.sh --no-prompt');
  run('bash', ['scripts/deploy-testnet-api.sh', '--no-prompt'], { dryRun });
}

function buildCompareUrl(remoteUrl, base, head) {
  const normalized = remoteUrl.replace(/\.git$/, '');

  if (normalized.startsWith('git@github.com:')) {
    return `https://github.com/${normalized.slice(
      'git@github.com:'.length
    )}/compare/${base}...${head}?expand=1`;
  }

  if (normalized.startsWith('https://github.com/')) {
    return `${normalized}/compare/${base}...${head}?expand=1`;
  }

  return null;
}

function findOpenPullRequest({ remote, base, head, dryRun }) {
  if (dryRun) {
    return null;
  }

  const probe = spawnSync('gh', ['--version'], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });

  if (probe.status !== 0) {
    return null;
  }

  const result = spawnSync(
    'gh',
    ['pr', 'list', '--base', base, '--head', head, '--state', 'open', '--json', 'number,url'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    }
  );

  if ((result.status ?? 1) !== 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    const first = parsed[0];
    if (!first || typeof first.number !== 'number') {
      return null;
    }

    return {
      number: first.number,
      url: typeof first.url === 'string' ? first.url : null,
    };
  } catch {
    return null;
  }
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
    console.log(`[dry-run] gh pr list --base ${base} --head ${head} --state open --json number,url`);
    console.log(`[dry-run] gh pr edit <number> --title \"${title}\" --body <release body>`);
    console.log(`[dry-run] gh pr create --base ${base} --head ${head} --title \"${title}\"`);
    if (compareUrl) {
      console.log(`[dry-run] PR URL: ${compareUrl}`);
    }
    return;
  }

  const existingPullRequest = findOpenPullRequest({ remote, base, head, dryRun });
  if (!existingPullRequest && compareUrl) {
    // no-op, keep compareUrl available for fallback logging
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

  if (existingPullRequest) {
    const result = spawnSync(
      'gh',
      [
        'pr',
        'edit',
        String(existingPullRequest.number),
        '--title',
        title,
        '--body',
        body,
      ],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );

    if ((result.status ?? 1) === 0) {
      const output = result.stdout.trim();
      if (output.length > 0) {
        console.log(output);
      }
      console.log(
        `Updated existing pull request #${existingPullRequest.number} for ${base} <- ${head}.`
      );
      return;
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    console.warn(
      `gh pr edit failed for #${existingPullRequest.number}; falling back to a new PR if needed.`
    );
  }

  const result = spawnSync(
    'gh',
    ['pr', 'create', '--base', base, '--head', head, '--title', title, '--body', body],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    }
  );

  if ((result.status ?? 1) === 0) {
    const output = result.stdout.trim();
    if (output.length > 0) {
      console.log(output);
    }
    console.log(`Created pull request for ${base} <- ${head}.`);
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
  if (currentBranch !== 'develop') {
    throw new Error(`Release promotion requires develop. Current branch: ${currentBranch}`);
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

function runBranchAwareVersioningRelease(releaseType, branchName, options) {
  if (branchName === 'develop') {
    const currentVersion = readRootVersion(branchName);
    const version = resolveDevelopmentReleaseVersion(releaseType, currentVersion);

    run('node', ['scripts/version-sync.mjs', '--version', version, '--target-branch', branchName], {
      dryRun: options.dryRun,
    });
    run('pnpm', ['exec', 'versioning', 'changelog'], { dryRun: options.dryRun });

    if (!options.dryRun) {
      try {
        run('node', ['scripts/check-changelog.mjs', '--auto-fix']);
      } catch (err) {
        // Ignored, check-changelog will print what failed
      }
    }

    return options.dryRun ? version : readRootVersion(branchName);
  }

  run(
    'pnpm',
    [
      'exec',
      'versioning',
      releaseType,
      '--branch-aware',
      '--target-branch',
      branchName,
      '--no-commit',
      '--no-tag',
    ],
    { dryRun: options.dryRun }
  );

  const version = readRootVersion(branchName);
  run('node', ['scripts/version-sync.mjs', '--version', version, '--target-branch', branchName], {
    dryRun: options.dryRun,
  });
  run('pnpm', ['exec', 'versioning', 'changelog'], { dryRun: options.dryRun });

  if (!options.dryRun) {
    try {
      run('node', ['scripts/check-changelog.mjs', '--auto-fix']);
    } catch (err) {
      // Ignored, check-changelog will print what failed
    }
  }

  return version;
}

function performVersionChange(target, options, branchName, productionBranch) {
  if (options.promote) {
    ensureChangelogFile(options.dryRun);

    const promotedVersion = stripVersionSuffix(readRootVersion(branchName));
    ensureValidVersion(promotedVersion);
    run(
      'node',
      [
        'scripts/version-sync.mjs',
        '--version',
        promotedVersion,
        '--target-branch',
        productionBranch,
      ],
      { dryRun: options.dryRun }
    );
    run('pnpm', ['exec', 'versioning', 'changelog'], { dryRun: options.dryRun });

    if (!options.dryRun) {
      try {
        run('node', ['scripts/check-changelog.mjs', '--auto-fix']);
      } catch (err) {
        // Ignored
      }
    }

    return options.dryRun ? promotedVersion : readRootVersion(productionBranch);
  }

  if (!target) {
    return readRootVersion(branchName);
  }

  ensureChangelogFile(options.dryRun);

  if (target === BUILD_TARGET) {
    if (branchName === 'master' || branchName === 'main') {
      throw new Error(
        `Build releases are only supported on development branches. Use patch/minor/major or --promote on ${branchName}.`
      );
    }

    if (branchName === 'develop') {
      return runBranchAwareVersioningRelease(BUILD_TARGET, branchName, options);
    }

    return runBranchAwareVersioningRelease('patch', branchName, options);
  }

  if (VALID_BUMPS.has(target)) {
    const version = runBranchAwareVersioningRelease(target, branchName, options);
    return version;
  }

  ensureValidVersion(target);
  run('node', ['scripts/version-sync.mjs', '--version', target, '--target-branch', branchName], {
    dryRun: options.dryRun,
  });
  run('pnpm', ['exec', 'versioning', 'changelog'], { dryRun: options.dryRun });

  if (!options.dryRun) {
    try {
      run('node', ['scripts/check-changelog.mjs', '--auto-fix']);
    } catch (err) {
      // Ignored
    }
  }

  return options.dryRun ? target : readRootVersion(branchName);
}

function main() {
  const { options, target } = parseArgs(process.argv.slice(2).filter((value) => value !== '--'));
  const directPushEnabled = shouldDirectPush({ target, options });

  if (!options.createCommit && directPushEnabled) {
    throw new Error('--no-commit requires --no-push.');
  }

  if (!options.allowDirty && !options.promote) {
    autoCommitPendingChanges(options.dryRun);
  }

  ensureCleanWorkingTree(options);
  validateAwsAccount();
  validateRootDocumentation();

  const currentBranch = getCurrentBranch();
  const productionBranch = resolveProductionBranch();
  const releaseBranch = options.promote ? productionBranch : currentBranch;
  const releaseBuildStage = resolveReleaseBuildStage(releaseBranch);
  const shouldPrepareRelease = Boolean(target) || options.promote;
  const releaseSnapshot = options.dryRun ? [] : captureFileContents(collectReleaseStatePaths(releaseBranch));
  let version;

  try {
    version = performVersionChange(target, options, currentBranch, productionBranch);

    if (shouldPrepareRelease) {
      buildReleaseArtifacts(options.dryRun, process.env, releaseBuildStage, releaseBranch);
    }

    if (shouldPrepareRelease && options.createCommit) {
      createReleaseCommit(version, options.dryRun, releaseBranch);
    }
  } catch (error) {
    if (!options.dryRun) {
      restoreFileContents(releaseSnapshot);
    }
    throw error;
  }

  if (shouldPrepareRelease && options.createTag) {
    createReleaseTag(version, options.dryRun);
  }

  if (directPushEnabled) {
    pushRelease({
      remote: options.remote,
      dryRun: options.dryRun,
      targetBranch: options.targetBranch,
    });
  }

  if (!options.promote && target === 'patch' && releaseBranch === 'develop' && directPushEnabled) {
    deployTestnetApi({ dryRun: options.dryRun });
  }

  if (options.promote) {
    promoteRelease({
      version,
      remote: options.remote,
      dryRun: options.dryRun,
      productionBranch,
    });
  }

  if (shouldPrepareRelease) {
    console.log(`Release prepared for v${version}.`);
  }
}

try {
  main();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
