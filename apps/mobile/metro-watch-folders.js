const fs = require("fs");
const path = require("path");

function getMetroWatchFolders(workspaceRoot, packageRoots) {
  return [
    ...packageRoots,
    path.join(workspaceRoot, "packages/auth/src"),
    path.join(workspaceRoot, "packages/i18n/src"),
    path.join(workspaceRoot, "packages/ui/src"),
    path.join(workspaceRoot, "packages/update/src"),
    path.join(workspaceRoot, "packages/wallet/src"),
  ];
}

function resolvePackageRoot(packageRequire, packageName) {
  const entryPath = packageRequire.resolve(packageName);
  let currentDir = path.dirname(entryPath);

  while (true) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Unable to locate package root for ${packageName}`);
    }
    currentDir = parentDir;
  }
}

function getPackageDependencyPackageRoots(packageRequire, dependencies) {
  return Object.keys(dependencies || {})
    .map((packageName) => {
      try {
        return resolvePackageRoot(packageRequire, packageName);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getPackageDependencyNodeModules(packageRequire, dependencies) {
  return Object.fromEntries(
    Object.keys(dependencies || {})
      .map((packageName) => {
        try {
          return [packageName, resolvePackageRoot(packageRequire, packageName)];
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  );
}

module.exports = {
  getPackageDependencyNodeModules,
  getPackageDependencyPackageRoots,
  getMetroWatchFolders,
  resolvePackageRoot,
};
