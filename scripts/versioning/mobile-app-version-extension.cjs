const {
  syncBranchVersionManifests,
  readRootVersion,
  syncSupplementalVersionFiles,
  resolveVersionContextBranch,
} = require('./version-files.cjs');

module.exports = {
  name: 'alternun-mobile-app-version-sync',
  description: 'Keeps apps/mobile/app.json aligned with the workspace version.',
  version: '1.0.0',
  async register() {},
  hooks: {
    async postSync(options = {}) {
      const branch = resolveVersionContextBranch();
      const version = readRootVersion(branch);

      syncBranchVersionManifests(version, branch);
      syncSupplementalVersionFiles(version);
      console.log(`Synced apps/mobile/app.json to ${version}`);
    },
    async postVersion(_type, version, options = {}) {
      const branch =
        typeof options.targetBranch === 'string' && options.targetBranch.length > 0
          ? options.targetBranch
          : resolveVersionContextBranch();

      syncBranchVersionManifests(version, branch);
      syncSupplementalVersionFiles(version);
      console.log(
        `Synced apps/mobile/app.json to ${version}. Use the pnpm release scripts so this file is committed with the release.`
      );
    },
  },
};
