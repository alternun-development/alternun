#!/usr/bin/env node

/**
 * generate-changelog-data.mjs
 *
 * Generates a TypeScript file with embedded changelog content for the mobile app.
 * This allows the changelog to be bundled directly without requiring filesystem operations.
 *
 * Usage: node scripts/generate-changelog-data.mjs <app-path>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appPath = process.argv[2];
if (!appPath) {
  console.error('Usage: node scripts/generate-changelog-data.mjs <app-path>');
  process.exit(1);
}

// Read the CHANGELOG.md from root
const changelogPath = path.resolve(__dirname, '..', 'CHANGELOG.md');
let changelogContent = '';

try {
  changelogContent = fs.readFileSync(changelogPath, 'utf-8');
} catch (error) {
  console.warn(`[generate-changelog-data] Failed to read CHANGELOG.md: ${error.message}`);
}

// Escape backticks and other special characters for safe embedding in template literals
const escapedContent = changelogContent
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

// Generate the changelogData.ts file
const outputPath = path.resolve(__dirname, '..', appPath, 'utils', 'changelogData.ts');
const outputDir = path.dirname(outputPath);

// Ensure the directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const templateContent = `/**
 * changelogData.ts
 *
 * Pre-compiled changelog data for the mobile app.
 * This file is AUTO-GENERATED during build - do not edit manually.
 * It allows the changelog to be bundled directly into the app.
 */

/**
 * Raw CHANGELOG.md content embedded at build time.
 */
export const CHANGELOG_TEXT = \`${escapedContent}\`;

/**
 * Version extracted from package.json for display purposes.
 */
export const APP_VERSION = '1.0.22';
`;

fs.writeFileSync(outputPath, templateContent, 'utf-8');
console.log(`✅ Generated changelog data: ${outputPath}`);
