const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildLatestChangesSection,
  checkRootReadme,
  displayVersion,
  selectChangelogBlock,
  updateReadmeContent,
  validateReadmeContent,
} = require('./readme-maintenance.cjs');

const sampleChangelog = `## [1.0.275](https://github.com/alternun-development/alternun/compare/v1.0.274...v1.0.275) (2026-05-25)

### Bug Fixes

- **repo:** chore: release v1.0.275-dev.0
- **repo:** fix(infra): preserve in-use ACM certs

## [1.0.274](https://github.com/alternun-development/alternun/compare/v1.0.273...v1.0.274) (2026-05-25)

### Bug Fixes

- **repo:** test(infra): deploy-authentik
`;

const sampleReadme = `# Alternun

## Version Management

Versioning is handled by \`@edcalderon/versioning\`.

Current version: **1.0.183**

## Security

- support@alternun.io
`;

test('selectChangelogBlock returns the matching release entry', () => {
  const block = selectChangelogBlock(sampleChangelog, '1.0.275-dev.0');

  assert.ok(block);
  assert.equal(displayVersion(block.version), '1.0.275');
});

test('buildLatestChangesSection mirrors the current changelog entry', () => {
  const section = buildLatestChangesSection({
    changelogContent: sampleChangelog,
    version: '1.0.275',
  });

  assert.match(section, /Latest Changes \(v1\.0\.275\)/);
  assert.match(section, /chore: release v1\.0\.275-dev\.0/);
  assert.match(section, /preserve in-use ACM certs/);
});

test('updateReadmeContent refreshes the version, support email, and latest changes block', () => {
  const updated = updateReadmeContent(sampleReadme, {
    version: '1.0.275',
    changelogContent: sampleChangelog,
    includeLatestChanges: true,
  });

  assert.match(updated, /Current version: \*\*1\.0\.275\*\*/);
  assert.match(updated, /support@alternun\.co/);
  assert.doesNotMatch(updated, /support@alternun\.io/);
  assert.match(updated, /Latest Changes \(v1\.0\.275\)/);
});

test('validateReadmeContent flags stale version and support email mismatches', () => {
  const result = validateReadmeContent(sampleReadme, {
    version: '1.0.275',
    changelogContent: sampleChangelog,
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('Current version')));
  assert.ok(result.issues.some((issue) => issue.includes('support email')));
});

test('checkRootReadme reports a missing README path', () => {
  const result = checkRootReadme({
    readmePath: '/tmp/alternun-missing-readme.md',
    changelogPath: '/tmp/alternun-missing-changelog.md',
    version: '1.0.275',
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes('README not found')));
});
