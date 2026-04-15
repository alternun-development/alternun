try {
  require('ts-node/register/transpile-only');
} catch {
  // The launcher or test harness may already have ts-node registered.
}

module.exports = require('../src/modules/better-auth-dev/better-auth-dev.config.ts');
