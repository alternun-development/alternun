// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json') as {
  name: string;
  version: string;
};

export const APP_NAME = packageJson.name;
export const APP_VERSION = packageJson.version;
