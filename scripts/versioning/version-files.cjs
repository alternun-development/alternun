const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ROOT_PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const VERSIONING_CONFIG_PATH = path.join(REPO_ROOT, 'versioning.config.json');

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

function readVersioningConfig() {
  return readJson(VERSIONING_CONFIG_PATH);
}

function readRootPackageJson() {
  return readJson(ROOT_PACKAGE_JSON_PATH);
}

function readRootVersion() {
  const rootPackageJson = readRootPackageJson();

  if (typeof rootPackageJson.version !== 'string' || rootPackageJson.version.length === 0) {
    throw new Error('Root package.json is missing a valid version.');
  }

  return rootPackageJson.version;
}

function setRootVersion(version) {
  const rootPackageJson = readRootPackageJson();
  rootPackageJson.version = version;
  writeJson(ROOT_PACKAGE_JSON_PATH, rootPackageJson);
  return version;
}

function getManagedPackageJsonPaths() {
  const config = readVersioningConfig();
  const managedPaths = [];

  if (typeof config.rootPackageJson === 'string' && config.rootPackageJson.length > 0) {
    managedPaths.push(config.rootPackageJson);
  }

  if (Array.isArray(config.packages)) {
    for (const packageDir of config.packages) {
      if (typeof packageDir !== 'string' || packageDir.length === 0) {
        continue;
      }

      managedPaths.push(`${packageDir.replace(/\\/g, '/')}/package.json`);
    }
  }

  return managedPaths;
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

function validateSupplementalVersionFiles(expectedVersion = readRootVersion()) {
  const issues = [];

  for (const entry of SUPPLEMENTAL_VERSION_FILES) {
    const absolutePath = path.join(REPO_ROOT, entry.relativePath);
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
  SUPPLEMENTAL_VERSION_FILES,
  getManagedPackageJsonPaths,
  readRootVersion,
  readVersioningConfig,
  setRootVersion,
  syncSupplementalVersionFiles,
  validateSupplementalVersionFiles,
};
