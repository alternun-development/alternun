const {
  readRootVersion,
  resolveVersionContextBranch,
} = require('./version-files.cjs');
const { syncRootReadme } = require('../readme-maintenance.cjs');

function syncRootReadmeForBranch(branch, includeLatestChanges = true, version = null) {
  return syncRootReadme({
    branch,
    version: typeof version === 'string' && version.length > 0 ? version : undefined,
    includeLatestChanges,
  });
}

module.exports = {
  name: 'alternun-root-readme-maintenance',
  description: 'Keeps the root README version, support email, and latest changes aligned.',
  version: '1.0.0',
  async register() {},
  hooks: {
    async postSync(options = {}) {
      const branch =
        typeof options.targetBranch === 'string' && options.targetBranch.length > 0
          ? options.targetBranch
          : resolveVersionContextBranch();

      syncRootReadmeForBranch(branch, false);
      console.log(`Synced root README version and support email for ${branch}.`);
    },
    async postVersion(_type, version, options = {}) {
      const branch =
        typeof options.targetBranch === 'string' && options.targetBranch.length > 0
          ? options.targetBranch
          : resolveVersionContextBranch();

      syncRootReadmeForBranch(branch, true, version || readRootVersion(branch));
      console.log(`Synced root README to ${version || readRootVersion(branch)}.`);
    },
    async postChangelog(options = {}) {
      const branch =
        typeof options.targetBranch === 'string' && options.targetBranch.length > 0
          ? options.targetBranch
          : resolveVersionContextBranch();

      syncRootReadmeForBranch(branch, true);
      console.log(`Synced root README latest changes for ${branch}.`);
    },
  },
};
