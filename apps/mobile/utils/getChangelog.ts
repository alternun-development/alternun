/**
 * getChangelog.ts
 *
 * Utility to load the CHANGELOG.md file content for use in footer components.
 * Reads synchronously at initialization time and caches the result.
 */

import fs from 'fs';
import path from 'path';

let cachedChangelog: string | null = null;

/**
 * Get the raw CHANGELOG.md content.
 * On native/Expo, this reads from the root of the monorepo.
 * Result is cached after first read.
 */
export function getChangelogContent(): string {
  if (cachedChangelog !== null) {
    return cachedChangelog;
  }

  try {
    // Resolve relative to this file's location, then go up to the monorepo root
    const changelogPath = path.resolve(__dirname, '../../..', 'CHANGELOG.md');
    const content = fs.readFileSync(changelogPath, 'utf-8');
    cachedChangelog = content;
    return content;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      '[getChangelog] Failed to read CHANGELOG.md:',
      error instanceof Error ? error.message : String(error)
    );
    // Return empty string if file not found (graceful degradation)
    return '';
  }
}

/**
 * Get the GitHub repository URL for changelog links.
 */
export const GITHUB_REPO_URL = 'https://github.com/alternun-development/alternun';
