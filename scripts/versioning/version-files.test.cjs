const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildVersionManifest,
  getBranchReleaseFiles,
  getManagedPackageJsonPaths,
  getManagedVersionManifestPaths,
  readRootVersion,
  resolveBranchVersionFile,
  resolveVersionContextBranch,
  validateBranchVersionFiles,
  validateProductionVersionMirror,
  validateVersionManifestStructure,
  validateWorkspacePackageVersions,
} = require('./version-files.cjs');

test('development branches resolve to the development version manifest', () => {
  assert.equal(resolveBranchVersionFile('develop'), 'version.development.json');
  assert.deepEqual(getBranchReleaseFiles('develop'), ['version.development.json']);
  assert.deepEqual(getManagedVersionManifestPaths('develop'), ['version.development.json']);

  const managedPaths = getManagedPackageJsonPaths('develop');
  assert.ok(managedPaths.includes('version.development.json'));
  assert.ok(!managedPaths.includes('version.production.json'));
  assert.ok(managedPaths.includes('apps/api/package.json'));
});

test('production branches resolve to the production version manifests', () => {
  assert.equal(resolveBranchVersionFile('master'), 'package.json');
  assert.deepEqual(getBranchReleaseFiles('master'), ['package.json', 'version.production.json']);

  const managedPaths = getManagedPackageJsonPaths('master');
  assert.ok(managedPaths.includes('package.json'));
  assert.ok(managedPaths.includes('version.production.json'));
});

test('version context branch prefers the environment override', () => {
  const previous = process.env.ALTERNUN_VERSION_BRANCH;

  try {
    process.env.ALTERNUN_VERSION_BRANCH = 'master';
    assert.equal(resolveVersionContextBranch('develop'), 'master');
  } finally {
    if (previous === undefined) {
      delete process.env.ALTERNUN_VERSION_BRANCH;
    } else {
      process.env.ALTERNUN_VERSION_BRANCH = previous;
    }
  }
});

test('current repository version files stay consistent', () => {
  const developmentVersion = readRootVersion('develop');

  assert.deepEqual(validateBranchVersionFiles(developmentVersion, 'develop'), {
    valid: true,
    issues: [],
  });

  assert.deepEqual(validateWorkspacePackageVersions(developmentVersion), {
    valid: true,
    issues: [],
  });

  assert.deepEqual(validateProductionVersionMirror(), {
    valid: true,
    issues: [],
  });

  assert.deepEqual(validateVersionManifestStructure('version.development.json', 'development'), {
    valid: true,
    issues: [],
  });

  assert.deepEqual(validateVersionManifestStructure('version.production.json', 'production'), {
    valid: true,
    issues: [],
  });
});

test('structured manifests keep release history and branch-aware mirrors', () => {
  const timestamp = '2026-03-17T21:21:57.065Z';
  const developmentManifest = buildVersionManifest({
    existingManifest: {
      version: '1.8.235',
      build: 0,
      lastUpdated: '2026-03-16T21:21:57.065Z',
      environment: 'development',
      lastDeployment: {
        id: 'development-0',
        version: '1.8.235',
        build: 0,
        date: '2026-03-16T21:21:57.065Z',
        message: 'Initial development manifest',
      },
      deploymentHistory: [
        {
          id: 'development-0',
          version: '1.8.235',
          build: 0,
          date: '2026-03-16T21:21:57.065Z',
          message: 'Initial development manifest',
        },
      ],
    },
    sourceVersion: '1.8.235-dev.36',
    environment: 'development',
    message: 'release patch on develop',
    now: timestamp,
  });

  assert.equal(developmentManifest.version, '1.8.235-dev.36');
  assert.equal(developmentManifest.build, 36);
  assert.equal(developmentManifest.environment, 'development');
  assert.equal(developmentManifest.lastDeployment.id, 'development-36');
  assert.equal(developmentManifest.deploymentHistory[0].version, '1.8.235-dev.36');
  assert.equal(developmentManifest.deploymentHistory.length, 2);

  const productionManifest = buildVersionManifest({
    existingManifest: {
      version: '1.8.180',
      build: 406,
      lastUpdated: '2026-02-24T02:52:45.000Z',
      environment: 'production',
      lastDeployment: {
        id: 'production-406',
        version: '1.8.180',
        build: 406,
        date: '2026-02-24T02:52:45.000Z',
        message: 'updates',
      },
      deploymentHistory: [
        {
          id: 'production-406',
          version: '1.8.180',
          build: 406,
          date: '2026-02-24T02:52:45.000Z',
          message: 'updates',
        },
      ],
    },
    sourceVersion: '1.8.235-dev.36',
    environment: 'production',
    normalizeVersion: true,
    message: 'release patch on develop',
    now: timestamp,
  });

  assert.equal(productionManifest.version, '1.8.235');
  assert.equal(productionManifest.build, 36);
  assert.equal(productionManifest.environment, 'production');
  assert.equal(productionManifest.lastDeployment.id, 'production-36');
  assert.equal(productionManifest.deploymentHistory[0].version, '1.8.235');
  assert.equal(productionManifest.deploymentHistory.length, 2);

  const stableManifest = buildVersionManifest({
    existingManifest: developmentManifest,
    sourceVersion: '1.8.235-dev.36',
    environment: 'development',
    message: 'release patch on develop',
    now: timestamp,
  });

  assert.deepEqual(stableManifest, developmentManifest);
});
