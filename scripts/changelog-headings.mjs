import fs from 'node:fs';

/**
 * conventional-changelog (angular preset) writes minor and major releases (x.y.0) as
 * "# [x.y.0](...)" but patches as "## [x.y.z](...)". The release tools (check-changelog,
 * README maintenance, production changelog) read "## [" blocks only, so a minor release
 * looked like it had no changelog entry. Version headings are always written as "##".
 */
export function normalizeChangelogHeadings(text) {
  return text.replace(/^# (\[?v?\d+\.\d+\.\d+)/gm, '## $1');
}

/** Rewrites the file only when a heading changed; returns whether it did. */
export function normalizeChangelogFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const text = fs.readFileSync(filePath, 'utf8');
  const normalized = normalizeChangelogHeadings(text);
  if (normalized === text) return false;
  fs.writeFileSync(filePath, normalized);
  return true;
}
