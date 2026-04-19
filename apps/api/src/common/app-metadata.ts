import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

let APP_NAME = '@alternun/api';
let APP_VERSION = '1.0.0';

// Try to read from package.json - check Lambda and standard paths
const tryReadPackageJson = (): { name: string; version: string } | null => {
  // Path order: prioritize Lambda-like environments
  const pathsToTry: string[] = [
    join(__dirname, 'package.json'),
    join(__dirname, '..', 'package.json'),
    resolve(process.cwd(), 'package.json'),
  ];

  for (const pkgPath of pathsToTry) {
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      if (existsSync(pkgPath)) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const content = readFileSync(pkgPath, 'utf-8');
        return JSON.parse(content) as { name: string; version: string };
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
};

// First try file system read
const pkg = tryReadPackageJson();
if (pkg) {
  APP_NAME = pkg.name;
  APP_VERSION = pkg.version;
} else {
  // Fallback: require from build-time path
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const builtPkg = require('../../package.json') as { name: string; version: string };
    APP_NAME = builtPkg.name;
    APP_VERSION = builtPkg.version;
  } catch {
    // Keep defaults
  }
}

export { APP_NAME, APP_VERSION };
