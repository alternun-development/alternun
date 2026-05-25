#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { syncRootReadme } = require('./readme-maintenance.cjs');

try {
  const result = syncRootReadme();

  if (result.changed) {
    console.log(`✅ Root README synced to v${result.version}`);
  } else {
    console.log(`✅ Root README already matched v${result.version}`);
  }
} catch (error) {
  console.error(`❌ README sync failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
