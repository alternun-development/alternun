const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const VERSIONING_CONFIG_PATH = path.join(REPO_ROOT, 'versioning.config.json');
const VERSION_MANIFEST_PATHS = {
  development: 'version.development.json',
  production: 'version.production.json',
};

const SUPPLEMENTAL_VERSION_FILES = [
  {
    label: 'apps/mobile/app.json -> expo.version',
    relativePath: 'apps/mobile/app.json',
    read(json) {
      return json?.expo?.version;
    },
    write(json, version) {
      if (!json.expo || typeof json.expo !== 'object' || Array.isArray(json.expo)) {
        throw new Error('apps/mobile/app.json is missing a valid expo object.');
      }

      json.expo.version = version;
      return json;
    },
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function captureFileContents(relativePaths) {
  if (!Array.isArray(relativePaths)) {
    return [];
  }

  return relativePaths
    .map((relativePath) => {
      if (typeof relativePath !== 'string' || relativePath.length === 0) {
        return null;
      }

      const normalized = normalizeRelativePath(relativePath);
      const absolutePath = path.join(REPO_ROOT, normalized);

      if (!fs.existsSync(absolutePath)) {
        return {
          relativePath: normalized,
          exists: false,
          contents: null,
        };
      }

      return {
        relativePath: normalized,
        exists: true,
        contents: fs.readFileSync(absolutePath, 'utf8'),
      };
    })
    .filter(Boolean);
}

function restoreFileContents(snapshot) {
  if (!Array.isArray(snapshot)) {
    return;
  }

  for (const entry of snapshot) {
    if (!entry || typeof entry.relativePath !== 'string' || entry.relativePath.length === 0) {
      continue;
    }

    const absolutePath = path.join(REPO_ROOT, normalizeRelativePath(entry.relativePath));

    if (!entry.exists) {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
      continue;
    }

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, String(entry.contents ?? ''), 'utf8');
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readVersioningConfig() {
  return readJson(VERSIONING_CONFIG_PATH);
}

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

function extractBuildNumber(version) {
  if (typeof version !== 'string' || version.length === 0) {
    return null;
  }

  const match = version.match(/-(?:.+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function stripVersionSuffix(version) {
  if (typeof version !== 'string' || version.length === 0) {
    return version;
  }

  const match = version.match(/^(\d+\.\d+\.\d+)/);
  return match ? match[1] : version;
}

function parseSemanticVersion(version) {
  if (typeof version !== 'string' || version.length === 0) {
    return null;
  }

  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

function incrementSemanticVersion(version, releaseType) {
  const parsed = parseSemanticVersion(version);

  if (!parsed) {
    throw new Error(`Unable to parse semantic version from "${version}".`);
  }

  switch (releaseType) {
    case 'patch':
      parsed.patch += 1;
      break;
    case 'minor':
      parsed.minor += 1;
      parsed.patch = 0;
      break;
    case 'major':
      parsed.major += 1;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    default:
      throw new Error(`Unsupported semantic release type: ${releaseType}`);
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

function incrementDevelopmentBuildVersion(version) {
  const baseVersion = stripVersionSuffix(version);

  if (typeof baseVersion !== 'string' || baseVersion.length === 0) {
    throw new Error(`Unable to derive a development build version from "${version}".`);
  }

  const buildMatch = typeof version === 'string' ? version.match(/-dev\.(\d+)$/) : null;
  const buildNumber = buildMatch ? Number.parseInt(buildMatch[1], 10) + 1 : 1;

  return `${baseVersion}-dev.${buildNumber}`;
}

function incrementDevelopmentSemanticVersion(version, releaseType) {
  const baseVersion = stripVersionSuffix(version);

  if (typeof baseVersion !== 'string' || baseVersion.length === 0) {
    throw new Error(`Unable to derive a semantic development version from "${version}".`);
  }

  const semanticVersion = incrementSemanticVersion(baseVersion, releaseType);
  return `${semanticVersion}-dev.0`;
}

function normalizeDeploymentRecord(record) {
  if (!isPlainObject(record)) {
    return null;
  }

  const { id, version, build, date, message } = record;

  if (typeof id !== 'string' || id.length === 0) {
    return null;
  }

  if (typeof version !== 'string' || version.length === 0) {
    return null;
  }

  if (!Number.isInteger(build) || build < 0) {
    return null;
  }

  if (typeof date !== 'string' || date.length === 0) {
    return null;
  }

  if (typeof message !== 'string') {
    return null;
  }

  return {
    id,
    version,
    build,
    date,
    message,
  };
}

function normalizeDeploymentHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.map(normalizeDeploymentRecord).filter(Boolean);
}

function readVersionManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const json = readJson(filePath);

    if (typeof json === 'string' && json.length > 0) {
      return { version: json };
    }

    if (isPlainObject(json)) {
      return { ...json };
    }
  } catch {
    return null;
  }

  return null;
}

function buildVersionManifest({
  existingManifest = {},
  sourceVersion,
  environment,
  normalizeVersion = false,
  idPrefix,
  message = 'Release updated',
  now = new Date().toISOString(),
  build = null,
} = {}) {
  if (typeof sourceVersion !== 'string' || sourceVersion.length === 0) {
    throw new Error('A source version is required to build a version manifest.');
  }

  if (typeof environment !== 'string' || environment.length === 0) {
    throw new Error('A manifest environment is required to build a version manifest.');
  }

  const existing = isPlainObject(existingManifest) ? { ...existingManifest } : {};
  const existingBuild =
    Number.isInteger(existing.build) && existing.build >= 0 ? existing.build : null;
  const existingHistory = normalizeDeploymentHistory(existing.deploymentHistory);
  const existingLastDeployment = normalizeDeploymentRecord(existing.lastDeployment);
  const manifestVersion = normalizeVersion ? stripVersionSuffix(sourceVersion) : sourceVersion;
  const sourceBuild = extractBuildNumber(sourceVersion);
  const sameVersion = typeof existing.version === 'string' && existing.version === manifestVersion;
  const resolvedBuild =
    Number.isInteger(build) && build >= 0
      ? build
      : sourceBuild !== null
      ? sourceBuild
      : sameVersion && existingBuild !== null
      ? existingBuild
      : existingBuild !== null
      ? existingBuild + 1
      : 1;
  const deploymentRecord = {
    id: `${idPrefix || environment}-${resolvedBuild}`,
    version: manifestVersion,
    build: resolvedBuild,
    date: now,
    message,
  };

  const existingMatches =
    typeof existing.version === 'string' &&
    existing.version === manifestVersion &&
    existingBuild === resolvedBuild &&
    existing.environment === environment &&
    existingLastDeployment !== null &&
    existingLastDeployment.id === deploymentRecord.id &&
    existingLastDeployment.version === deploymentRecord.version &&
    existingLastDeployment.build === deploymentRecord.build &&
    existingLastDeployment.message === deploymentRecord.message &&
    existingHistory.length > 0 &&
    existingHistory[0].id === deploymentRecord.id;

  if (existingMatches) {
    return {
      ...existing,
      version: manifestVersion,
      build: resolvedBuild,
      lastUpdated: typeof existing.lastUpdated === 'string' ? existing.lastUpdated : now,
      environment,
      lastDeployment: existingLastDeployment,
      deploymentHistory: existingHistory,
    };
  }

  const deploymentHistory = existingHistory.filter((entry) => entry.id !== deploymentRecord.id);
  deploymentHistory.unshift(deploymentRecord);

  return {
    ...existing,
    version: manifestVersion,
    build: resolvedBuild,
    lastUpdated: now,
    environment,
    lastDeployment: deploymentRecord,
    deploymentHistory,
  };
}

function getCurrentBranch() {
  try {
    const branch = execFileSync('git', ['branch', '--show-current'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (branch.length > 0) {
      return branch;
    }
  } catch {
    // Fall through to the configured default branch.
  }

  const config = readVersioningConfig();
  return config.branchAwareness?.defaultBranch || 'master';
}

function resolveVersionContextBranch(branch = getCurrentBranch()) {
  const envBranch = process.env.ALTERNUN_VERSION_BRANCH;

  if (typeof envBranch === 'string' && envBranch.trim().length > 0) {
    return envBranch.trim();
  }

  return branch;
}

function readVersionField(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const json = readJson(filePath);

    if (typeof json === 'string' && json.length > 0) {
      return json;
    }

    if (json && typeof json === 'object' && !Array.isArray(json)) {
      const version = json.version;

      if (typeof version === 'string' && version.length > 0) {
        return version;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function validateVersionManifestStructure(relativePath, expectedEnvironment) {
  const issues = [];
  const absolutePath = path.join(REPO_ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    issues.push(`${relativePath} is missing`);
    return {
      valid: false,
      issues,
    };
  }

  const manifest = readVersionManifest(absolutePath);
  if (!isPlainObject(manifest)) {
    issues.push(`${relativePath} is not a valid JSON manifest`);
    return {
      valid: false,
      issues,
    };
  }

  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    issues.push(`${relativePath} is missing a version field`);
  }

  if (!Number.isInteger(manifest.build) || manifest.build < 0) {
    issues.push(`${relativePath} is missing a valid build field`);
  }

  if (typeof manifest.lastUpdated !== 'string' || manifest.lastUpdated.length === 0) {
    issues.push(`${relativePath} is missing lastUpdated`);
  }

  if (typeof manifest.environment !== 'string' || manifest.environment.length === 0) {
    issues.push(`${relativePath} is missing environment`);
  } else if (expectedEnvironment && manifest.environment !== expectedEnvironment) {
    issues.push(
      `${relativePath} has environment ${manifest.environment} but expected ${expectedEnvironment}`
    );
  }

  const normalizedLastDeployment = normalizeDeploymentRecord(manifest.lastDeployment);
  if (normalizedLastDeployment === null) {
    issues.push(`${relativePath} is missing a valid lastDeployment record`);
  }

  if (!Array.isArray(manifest.deploymentHistory)) {
    issues.push(`${relativePath} is missing deploymentHistory`);
  } else {
    const invalidHistoryIndex = manifest.deploymentHistory.findIndex(
      (entry) => normalizeDeploymentRecord(entry) === null
    );

    if (invalidHistoryIndex !== -1) {
      issues.push(
        `${relativePath} has an invalid deploymentHistory entry at index ${invalidHistoryIndex}`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function getWorkspacePackageJsonPaths() {
  const config = readVersioningConfig();
  const managedPaths = [];

  if (Array.isArray(config.packages)) {
    for (const packageDir of config.packages) {
      if (typeof packageDir !== 'string' || packageDir.length === 0) {
        continue;
      }

      managedPaths.push(normalizeRelativePath(`${packageDir}/package.json`));
    }
  }

  return managedPaths;
}

function getRootPackageJsonPath() {
  const config = readVersioningConfig();
  return normalizeRelativePath(
    typeof config.rootPackageJson === 'string' && config.rootPackageJson.length > 0
      ? config.rootPackageJson
      : 'package.json'
  );
}

function matchesBranchPattern(branch, pattern) {
  if (!pattern.includes('*')) {
    return branch === pattern;
  }

  const escapedPattern = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escapedPattern}$`).test(branch);
}

function resolveBranchRule(branch, config = readVersioningConfig()) {
  const branchAwareness = config.branchAwareness || {};
  const defaultBranch = branchAwareness.defaultBranch || 'master';
  const branches = branchAwareness.branches || {};

  if (branches[branch]) {
    return {
      matchPattern: branch,
      resolvedConfig: branches[branch],
      defaultBranch,
      branchAwareness,
    };
  }

  const wildcardPatterns = Object.keys(branches)
    .filter((pattern) => pattern.includes('*'))
    .sort((a, b) => b.length - a.length);

  for (const pattern of wildcardPatterns) {
    if (matchesBranchPattern(branch, pattern)) {
      return {
        matchPattern: pattern,
        resolvedConfig: branches[pattern],
        defaultBranch,
        branchAwareness,
      };
    }
  }

  if (branches[defaultBranch]) {
    return {
      matchPattern: defaultBranch,
      resolvedConfig: branches[defaultBranch],
      defaultBranch,
      branchAwareness,
    };
  }

  return {
    matchPattern: defaultBranch,
    resolvedConfig: null,
    defaultBranch,
    branchAwareness,
  };
}

function getBranchReleaseFiles(branch = getCurrentBranch()) {
  const config = readVersioningConfig();
  const { resolvedConfig } = resolveBranchRule(branch, config);
  const branchAwareness = config.branchAwareness || {};

  if (!branchAwareness.enabled) {
    const rootPackageJson =
      typeof config.rootPackageJson === 'string' && config.rootPackageJson.length > 0
        ? normalizeRelativePath(config.rootPackageJson)
        : 'package.json';
    return [rootPackageJson];
  }

  const syncFiles = Array.isArray(resolvedConfig?.syncFiles) ? resolvedConfig.syncFiles : [];
  const normalizedFiles = syncFiles
    .map((filePath) => (typeof filePath === 'string' ? normalizeRelativePath(filePath) : ''))
    .filter(Boolean);

  if (normalizedFiles.length > 0) {
    return normalizedFiles;
  }

  const rootPackageJson =
    typeof config.rootPackageJson === 'string' && config.rootPackageJson.length > 0
      ? normalizeRelativePath(config.rootPackageJson)
      : 'package.json';

  return [rootPackageJson];
}

function getVersionReadCandidates(branch = getCurrentBranch()) {
  const config = readVersioningConfig();
  const candidates = [];
  const addCandidate = (filePath) => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return;
    }

    const normalized = normalizeRelativePath(filePath);
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  for (const filePath of getBranchReleaseFiles(branch)) {
    addCandidate(filePath);
  }

  addCandidate(config.rootPackageJson);
  addCandidate('package.json');
  addCandidate('version.production.json');
  addCandidate('version.development.json');

  return candidates;
}

function readRootVersion(branch = getCurrentBranch()) {
  const candidates = getVersionReadCandidates(branch);

  for (const relativePath of candidates) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const version = readVersionField(absolutePath);

    if (typeof version === 'string' && version.length > 0) {
      return version;
    }
  }

  throw new Error(`Unable to determine the current version for branch "${branch}".`);
}

function setRootVersion(version, branch = getCurrentBranch()) {
  const versionFile = resolveBranchVersionFile(branch);
  const absolutePath = path.join(REPO_ROOT, versionFile);
  let json = {};

  if (fs.existsSync(absolutePath)) {
    try {
      const existing = readJson(absolutePath);

      if (typeof existing === 'string' && existing.length > 0) {
        json = { version: existing };
      } else if (isPlainObject(existing)) {
        json = existing;
      }
    } catch {
      json = {};
    }
  }

  if (!isPlainObject(json)) {
    json = {};
  }

  json.version = version;
  writeJson(absolutePath, json);
  return version;
}

function resolveBranchVersionFile(branch = getCurrentBranch()) {
  return getBranchReleaseFiles(branch)[0] || 'package.json';
}

function getManagedPackageJsonPaths(branch = getCurrentBranch()) {
  const managedPaths = new Set([
    ...getManagedVersionManifestPaths(branch),
    ...getWorkspacePackageJsonPaths(),
  ]);
  return [...managedPaths];
}

function getManagedVersionManifestPaths(branch = getCurrentBranch()) {
  return [...new Set(getBranchReleaseFiles(branch))];
}

function syncSupplementalVersionFiles(version) {
  const touchedFiles = [];

  for (const entry of SUPPLEMENTAL_VERSION_FILES) {
    const absolutePath = path.join(REPO_ROOT, entry.relativePath);
    const json = readJson(absolutePath);
    entry.write(json, version);
    writeJson(absolutePath, json);
    touchedFiles.push(entry.relativePath);
  }

  return touchedFiles;
}

function syncWorkspacePackageVersions(version = readRootVersion()) {
  const semanticVersion = stripVersionSuffix(version);

  if (typeof semanticVersion !== 'string' || semanticVersion.length === 0) {
    throw new Error(`Unable to derive a semantic package version from "${version}".`);
  }

  const touchedFiles = [];
  const rootPackageJsonPath = getRootPackageJsonPath();
  const rootPackageJsonAbsolutePath = path.join(REPO_ROOT, rootPackageJsonPath);

  if (fs.existsSync(rootPackageJsonAbsolutePath)) {
    const json = readJson(rootPackageJsonAbsolutePath);
    if (!isPlainObject(json)) {
      throw new Error(`${rootPackageJsonPath} is not a valid package.json file.`);
    }

    if (json.version !== semanticVersion) {
      json.version = semanticVersion;
      writeJson(rootPackageJsonAbsolutePath, json);
      touchedFiles.push(rootPackageJsonPath);
    }
  }

  for (const relativePath of getWorkspacePackageJsonPaths()) {
    const absolutePath = path.join(REPO_ROOT, relativePath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const json = readJson(absolutePath);
    if (!isPlainObject(json)) {
      throw new Error(`${relativePath} is not a valid package.json file.`);
    }

    if (json.version === semanticVersion) {
      continue;
    }

    json.version = semanticVersion;
    writeJson(absolutePath, json);
    touchedFiles.push(relativePath);
  }

  return touchedFiles;
}

function syncVersionManifestFile(relativePath, options) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  const existingManifest = readVersionManifest(absolutePath) || {};
  const nextManifest = buildVersionManifest({
    existingManifest,
    ...options,
  });

  writeJson(absolutePath, nextManifest);
  return nextManifest;
}

function syncBranchVersionManifests(
  version = readRootVersion(),
  branch = getCurrentBranch(),
  options = {}
) {
  const config = readVersioningConfig();
  const { matchPattern, resolvedConfig } = resolveBranchRule(branch, config);
  const now = options.now || new Date().toISOString();
  const developmentMessage = options.developmentMessage || `Release ${version}`;
  const productionMessage = options.productionMessage || developmentMessage;
  const touchedFiles = [];

  if (resolvedConfig?.environment === 'production') {
    syncVersionManifestFile(VERSION_MANIFEST_PATHS.production, {
      sourceVersion: version,
      environment: 'production',
      normalizeVersion: true,
      idPrefix: 'production',
      message: productionMessage,
      now,
      build: options.productionBuild,
    });
    touchedFiles.push(VERSION_MANIFEST_PATHS.production);
    return touchedFiles;
  }

  syncVersionManifestFile(VERSION_MANIFEST_PATHS.development, {
    sourceVersion: version,
    environment: resolvedConfig?.environment || 'development',
    normalizeVersion: false,
    idPrefix: 'development',
    message: developmentMessage,
    now,
    build: options.developmentBuild,
  });
  touchedFiles.push(VERSION_MANIFEST_PATHS.development);

  if (matchPattern === 'develop') {
    syncVersionManifestFile(VERSION_MANIFEST_PATHS.production, {
      sourceVersion: version,
      environment: 'production',
      normalizeVersion: true,
      idPrefix: 'production',
      message: productionMessage,
      now,
      build: options.productionBuild,
    });
    touchedFiles.push(VERSION_MANIFEST_PATHS.production);
  }

  return touchedFiles;
}

function validateBranchVersionFiles(
  expectedVersion = readRootVersion(),
  branch = getCurrentBranch()
) {
  const issues = [];
  const branchFiles = getBranchReleaseFiles(branch);

  for (const relativePath of branchFiles) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const actualVersion = readVersionField(absolutePath);

    if (actualVersion === null) {
      issues.push(`${relativePath} is missing a valid version`);
      continue;
    }

    if (actualVersion !== expectedVersion) {
      issues.push(`${relativePath} is ${actualVersion} but expected ${expectedVersion}`);
    }

    if (
      relativePath === VERSION_MANIFEST_PATHS.development ||
      relativePath === VERSION_MANIFEST_PATHS.production
    ) {
      const expectedEnvironment =
        relativePath === VERSION_MANIFEST_PATHS.production ? 'production' : 'development';
      const structureValidation = validateVersionManifestStructure(
        relativePath,
        expectedEnvironment
      );

      issues.push(...structureValidation.issues);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function validateProductionVersionMirror() {
  const config = readVersioningConfig();
  const { branchAwareness = {} } = config;
  const productionFiles = [];

  for (const rule of Object.values(branchAwareness.branches || {})) {
    if (rule?.environment !== 'production' || !Array.isArray(rule.syncFiles)) {
      continue;
    }

    for (const relativePath of rule.syncFiles) {
      if (typeof relativePath !== 'string' || relativePath.length === 0) {
        continue;
      }

      const normalized = normalizeRelativePath(relativePath);
      if (!productionFiles.includes(normalized)) {
        productionFiles.push(normalized);
      }
    }
  }

  const issues = [];

  if (productionFiles.length === 0) {
    return {
      valid: true,
      issues,
    };
  }

  const versions = [];

  for (const relativePath of productionFiles) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const actualVersion = readVersionField(absolutePath);

    if (actualVersion === null) {
      issues.push(`${relativePath} is missing a valid version`);
      continue;
    }

    versions.push({ relativePath, actualVersion });

    if (relativePath === VERSION_MANIFEST_PATHS.production) {
      const structureValidation = validateVersionManifestStructure(relativePath, 'production');
      issues.push(...structureValidation.issues);
    }
  }

  if (versions.length === 0) {
    return {
      valid: false,
      issues,
    };
  }

  const baseline = versions[0].actualVersion;

  for (const { relativePath, actualVersion } of versions.slice(1)) {
    if (actualVersion !== baseline) {
      issues.push(`${relativePath} is ${actualVersion} but expected ${baseline}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function validateWorkspacePackageVersions(expectedVersion = readRootVersion()) {
  const issues = [];
  const semanticExpectedVersion = stripVersionSuffix(expectedVersion);

  for (const relativePath of getWorkspacePackageJsonPaths()) {
    const absolutePath = path.join(REPO_ROOT, relativePath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const actualVersion = readVersionField(absolutePath);

    if (actualVersion === null) {
      issues.push(`${relativePath} is missing a valid version`);
      continue;
    }

    if (actualVersion !== semanticExpectedVersion) {
      issues.push(`${relativePath} is ${actualVersion} but expected ${semanticExpectedVersion}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function validateSupplementalVersionFiles(expectedVersion = readRootVersion()) {
  const issues = [];

  for (const entry of SUPPLEMENTAL_VERSION_FILES) {
    const absolutePath = path.join(REPO_ROOT, entry.relativePath);
    if (!fs.existsSync(absolutePath)) {
      issues.push(`${entry.relativePath} is missing`);
      continue;
    }

    const json = readJson(absolutePath);
    const actualVersion = entry.read(json);

    if (actualVersion !== expectedVersion) {
      issues.push(`${entry.label} is ${String(actualVersion)} but expected ${expectedVersion}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

module.exports = {
  REPO_ROOT,
  VERSION_MANIFEST_PATHS,
  SUPPLEMENTAL_VERSION_FILES,
  buildVersionManifest,
  getBranchReleaseFiles,
  getCurrentBranch,
  getManagedPackageJsonPaths,
  getManagedVersionManifestPaths,
  getRootPackageJsonPath,
  getVersionReadCandidates,
  getWorkspacePackageJsonPaths,
  captureFileContents,
  restoreFileContents,
  incrementDevelopmentBuildVersion,
  incrementDevelopmentSemanticVersion,
  incrementSemanticVersion,
  readRootVersion,
  readVersionManifest,
  readVersioningConfig,
  parseSemanticVersion,
  stripVersionSuffix,
  resolveVersionContextBranch,
  setRootVersion,
  resolveBranchRule,
  resolveBranchVersionFile,
  syncBranchVersionManifests,
  syncSupplementalVersionFiles,
  syncWorkspacePackageVersions,
  validateBranchVersionFiles,
  validateProductionVersionMirror,
  validateVersionManifestStructure,
  validateWorkspacePackageVersions,
  validateSupplementalVersionFiles,
};
