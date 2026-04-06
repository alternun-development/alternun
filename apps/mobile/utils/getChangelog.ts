/**
 * getChangelog.ts
 *
 * Utility to load the CHANGELOG.md file content for use in footer components.
 * Attempts multiple strategies: require, fs for web builds, and graceful fallback.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-var-requires,global-require */

let cachedChangelog: string | null = null;

/**
 * Get the raw CHANGELOG.md content.
 * Tries multiple loading strategies to support different build environments.
 * Result is cached after first read.
 */
export function getChangelogContent(): string {
  if (cachedChangelog !== null) {
    return cachedChangelog;
  }

  try {
    // Strategy 1: Try direct require (works in bundlers like Metro/webpack)
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const changelogModule = require('../../../CHANGELOG.md');
    const content =
      typeof changelogModule === 'string'
        ? changelogModule
        : changelogModule.default || changelogModule;

    if (typeof content === 'string' && content.trim().length > 0) {
      cachedChangelog = content;
      return content;
    }
  } catch {
    // Continue to next strategy
  }

  try {
    // Strategy 2: Try filesystem read (works in Node.js environments)
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const path = require('path');
    const changelogPath = path.resolve(__dirname, '../../..', 'CHANGELOG.md');
    const content = fs.readFileSync(changelogPath, 'utf-8');

    if (content && content.trim().length > 0) {
      cachedChangelog = content;
      return content;
    }
  } catch {
    // Continue to fallback
  }

  // eslint-disable-next-line no-console
  console.warn('[getChangelog] Unable to load CHANGELOG.md from any source');
  // Return empty string if all strategies fail (graceful degradation)
  return '';
}

/**
 * Get the GitHub repository URL for changelog links.
 */
export const GITHUB_REPO_URL = 'https://github.com/alternun-development/alternun';
