// Use relative path that works in bundled Lambda environment
let packageJson: { name: string; version: string } = { name: '@alternun/api', version: '1.0.0' };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  packageJson = require('./package.json') as { name: string; version: string };
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    packageJson = require('../../package.json') as { name: string; version: string };
  } catch {
    // Fallback to default
  }
}

export const APP_NAME = packageJson.name;
export const APP_VERSION = packageJson.version;
