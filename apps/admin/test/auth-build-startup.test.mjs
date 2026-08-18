import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const adminDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(adminDirectory, 'package.json'), 'utf8'));

void test('admin development commands build the workspace auth package first', () => {
  assert.match(packageJson.scripts.dev, /^pnpm --filter @alternun\/auth run build && vite$/);
  assert.match(
    packageJson.scripts['dev:local'],
    /^pnpm --filter @alternun\/auth run build && vite --host 127\.0\.0\.1 --port 5173 --strictPort$/
  );
});
