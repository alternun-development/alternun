const assert = require('node:assert/strict');
const test = require('node:test');

const {
  captureFileContents,
  buildVersionManifest,
  compareReleaseVersions,
  incrementDevelopmentBuildVersion,
  incrementDevelopmentSemanticVersion,
  getBranchReleaseFiles,
  getManagedPackageJsonPaths,
  getManagedVersionManifestPaths,
  readRootVersion,
  resolveBranchVersionFile,
  resolveVersionContextBranch,
  restoreFileContents,
  syncBranchVersionManifests,
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

test('development release versions bump build or reset build after semantic bumps', () => {
  assert.equal(incrementDevelopmentBuildVersion('1.0.183-dev.3'), '1.0.183-dev.4');
  assert.equal(incrementDevelopmentBuildVersion('1.0.183'), '1.0.183-dev.1');
  assert.equal(incrementDevelopmentSemanticVersion('1.0.183-dev.3', 'patch'), '1.0.184-dev.0');
  assert.equal(incrementDevelopmentSemanticVersion('1.0.183-dev.3', 'minor'), '1.1.0-dev.0');
});

test('release version comparison treats stable releases as newer than dev builds on the same base', () => {
  assert.equal(compareReleaseVersions('1.0.191', '1.0.191-dev.3'), 1);
  assert.equal(compareReleaseVersions('1.0.191-dev.3', '1.0.191-dev.2'), 1);
  assert.equal(compareReleaseVersions('1.0.191-dev.3', '1.0.191'), -1);
  assert.equal(compareReleaseVersions('1.0.191', '1.0.191'), 0);
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

test('develop branch sync only updates the development manifest track', () => {
  const snapshot = captureFileContents(['version.development.json', 'version.production.json']);

  try {
    const touchedFiles = syncBranchVersionManifests('1.0.191-dev.4', 'develop', {
      now: '2026-04-21T00:00:00.000Z',
      developmentBuild: 4,
    });

    assert.deepEqual(touchedFiles, ['version.development.json']);
  } finally {
    restoreFileContents(snapshot);
  }
});

test('release manifests refuse to roll back to an older version', () => {
  assert.throws(
    () =>
      buildVersionManifest({
        existingManifest: {
          version: '1.0.191-dev.3',
          build: 3,
          lastUpdated: '2026-04-21T18:26:57.577Z',
          environment: 'development',
          lastDeployment: {
            id: 'development-3',
            version: '1.0.191-dev.3',
            build: 3,
            date: '2026-04-21T18:26:57.577Z',
            message: 'Release 1.0.191-dev.3',
          },
          deploymentHistory: [
            {
              id: 'development-3',
              version: '1.0.191-dev.3',
              build: 3,
              date: '2026-04-21T18:26:57.577Z',
              message: 'Release 1.0.191-dev.3',
            },
          ],
        },
        sourceVersion: '1.0.180-dev.0',
        environment: 'development',
        message: 'rollback attempt',
        now: '2026-04-21T18:26:57.577Z',
      }),
    /Refusing to roll back development manifest/
  );

  assert.throws(
    () =>
      buildVersionManifest({
        existingManifest: {
          version: '1.0.191',
          build: 3,
          lastUpdated: '2026-04-21T19:11:26.800Z',
          environment: 'production',
          lastDeployment: {
            id: 'production-3',
            version: '1.0.191',
            build: 3,
            date: '2026-04-21T19:11:26.800Z',
            message: 'Release 1.0.191-dev.3',
          },
          deploymentHistory: [
            {
              id: 'production-3',
              version: '1.0.191',
              build: 3,
              date: '2026-04-21T19:11:26.800Z',
              message: 'Release 1.0.191-dev.3',
            },
          ],
        },
        sourceVersion: '1.0.180-dev.0',
        environment: 'production',
        normalizeVersion: true,
        message: 'rollback attempt',
        now: '2026-04-21T19:11:26.800Z',
      }),
    /Refusing to roll back production manifest/
  );

  assert.throws(
    () =>
      buildVersionManifest({
        existingManifest: {
          version: '1.8.235-dev.36',
          build: 36,
          lastUpdated: '2026-03-17T21:21:57.065Z',
          environment: 'development',
          lastDeployment: {
            id: 'development-36',
            version: '1.8.235-dev.36',
            build: 36,
            date: '2026-03-17T21:21:57.065Z',
            message: 'release patch on develop',
          },
          deploymentHistory: [
            {
              id: 'development-36',
              version: '1.8.235-dev.36',
              build: 36,
              date: '2026-03-17T21:21:57.065Z',
              message: 'release patch on develop',
            },
          ],
        },
        sourceVersion: '1.8.235-dev.35',
        environment: 'development',
        message: 'rollback attempt',
        now: '2026-03-17T21:21:57.065Z',
      }),
    /Refusing to roll back development manifest/
  );
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
