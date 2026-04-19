import { readFileSync } from 'fs';
import { join } from 'path';

let APP_NAME = '@alternun/api';
let APP_VERSION = '1.0.0';

try {
  // Try to read from ./package.json (Lambda environment)
  const pkgPath = join(__dirname, '..', 'package.json');
  const content = readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(content) as { name: string; version: string };
  APP_NAME = pkg.name;
  APP_VERSION = pkg.version;
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json') as { name: string; version: string };
    APP_NAME = pkg.name;
    APP_VERSION = pkg.version;
  } catch {
    // Use defaults
  }
}

export { APP_NAME, APP_VERSION };
