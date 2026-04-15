import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('ts-node/register/transpile-only');
const { loadEnvFile, resolveBetterAuthDevConfig } = require('./better-auth-dev-env.cjs');
const { createBetterAuthDevServer } = require('../src/modules/better-auth-dev/better-auth-dev.server.ts');

loadEnvFile();

const config = resolveBetterAuthDevConfig(process.env);

if (!config.googleClientId || !config.googleClientSecret) {
  throw new Error(
    [
      'Better Auth dev server requires GOOGLE_AUTH_CLIENT_ID and GOOGLE_AUTH_CLIENT_SECRET.',
      'Populate apps/api/.env.better-auth before running dev:all.',
    ].join(' ')
  );
}
const server = createBetterAuthDevServer(config);

server.listen(config.port, config.host, () => {
  process.stdout.write(
    `Better Auth dev service listening on http://${config.host}:${config.port}\n`
  );
});
