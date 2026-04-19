import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

let APP_NAME = '@alternun/api';
let APP_VERSION = '1.0.163'; // Updated by release script

// Try to read from package.json if available
const pathsToTry = [
  join(__dirname, 'package.json'),
  join(__dirname, '..', 'package.json'),
  resolve(process.cwd(), 'package.json'),
];

for (const pkgPath of pathsToTry) {
  if (existsSync(pkgPath)) {
    try {
      const content = readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as { name: string; version: string };
      APP_NAME = pkg.name;
      APP_VERSION = pkg.version;
      break;
    } catch {
      // Continue to next path
    }
  }
}

// Fallback to require() for dev
if (APP_VERSION === '1.0.163') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json') as { name: string; version: string };
    if (pkg.version && pkg.version !== '1.0.163') {
      APP_NAME = pkg.name;
      APP_VERSION = pkg.version;
    }
  } catch {
    // Use hardcoded version
  }
}

export { APP_NAME, APP_VERSION };
