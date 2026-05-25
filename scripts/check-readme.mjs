#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { checkRootReadme } = require('./readme-maintenance.cjs');

const result = checkRootReadme();

if (!result.valid) {
  console.error('❌ README validation issues:');
  for (const issue of result.issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

console.log('✅ README is aligned with the current release state.');
