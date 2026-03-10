const {
  readRootVersion,
  syncSupplementalVersionFiles,
} = require('./version-files.cjs');

module.exports = {
  name: 'alternun-mobile-app-version-sync',
  description: 'Keeps apps/mobile/app.json aligned with the workspace version.',
  version: '1.0.0',
  async register() {},
  hooks: {
    async postSync(options = {}) {
      const version = typeof options.version === 'string' && options.version.length > 0
        ? options.version
        : readRootVersion();

      syncSupplementalVersionFiles(version);
      console.log(`Synced apps/mobile/app.json to ${version}`);
    },
    async postVersion(_type, version) {
      syncSupplementalVersionFiles(version);
      console.log(
        `Synced apps/mobile/app.json to ${version}. Use the pnpm release scripts so this file is committed with the release.`
      );
    },
  },
};
