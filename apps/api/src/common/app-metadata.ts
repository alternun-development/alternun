import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

let APP_NAME = '@alternun/api';
let APP_VERSION = '1.0.0';

// Try multiple paths to find package.json
const pathsToTry = [
  // Lambda environment - package.json in same dir as lambda.js
  join(__dirname, 'package.json'),
  // Fallback - one level up
  join(__dirname, '..', 'package.json'),
  // Fallback - relative to CWD
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

// Final fallback: try require
if (APP_VERSION === '1.0.0') {
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
