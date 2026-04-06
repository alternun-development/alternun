/**
 * getChangelog.ts
 *
 * Utility to load and parse the CHANGELOG.md file content for use in footer components.
 */

let cachedChangelog: string | null = null;

/**
 * Changelog entry type matching @alternun/ui exports
 */
export interface ChangelogItem {
  text: string;
  scope?: string;
  commitHash?: string;
  commitUrl?: string;
}

export interface ChangelogSection {
  label: string;
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  compareUrl?: string;
  sections: ChangelogSection[];
  hasContent: boolean;
}

interface CommitReference {
  text: string;
  commitHash?: string;
  commitUrl?: string;
}

function isHexString(value: string): boolean {
  if (value.length < 7) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const isDigit = code >= 48 && code <= 57;
    const lowerCode = code | 32;
    const isHexLetter = lowerCode >= 97 && lowerCode <= 102;

    if (!isDigit && !isHexLetter) {
      return false;
    }
  }

  return true;
}

function extractTrailingCommitReference(input: string): CommitReference {
  const trimmed = input.trim();
  const linkStart = trimmed.lastIndexOf('](');

  if (linkStart === -1) {
    return { text: input };
  }

  const hashStart = trimmed.lastIndexOf('[', linkStart);
  const urlStart = linkStart + 2;
  const urlEnd = trimmed.indexOf(')', urlStart);

  if (hashStart === -1 || urlEnd === -1) {
    return { text: input };
  }

  const commitHash = trimmed.slice(hashStart + 1, linkStart);
  const commitUrl = trimmed.slice(urlStart, urlEnd);

  if (!isHexString(commitHash)) {
    return { text: input };
  }

  for (let index = urlEnd + 1; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (char !== ')' && char !== ' ' && char !== '\t' && char !== '.') {
      return { text: input };
    }
  }

  let text = trimmed.slice(0, hashStart).trim();
  if (text.endsWith('(')) {
    text = text.slice(0, -1).trim();
  }

  return { text, commitHash, commitUrl };
}

/**
 * Parse a raw CHANGELOG.md string into structured ChangelogEntry objects.
 * Handles both formats:
 *   ## [1.0.18](compare-url) (2026-04-05)
 *   ## [1.0.18] - 2026-04-05
 * Deduplicates repeated version blocks.
 */
export function parseChangelog(raw: string): ChangelogEntry[] {
  if (!raw || raw.trim().length === 0) return [];

  // Split at every "## [" boundary (version header)
  const blocks = raw.split(/(?=^## \[)/m).filter((b) => /^## \[/.test(b.trim()));

  const entries: ChangelogEntry[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const lines = block.split('\n');
    const headerLine = lines[0] ?? '';

    // Match: ## [1.0.18](url) (2026-04-05)  or  ## [1.0.18] - 2026-04-05
    const m = headerLine.match(
      /^## \[([^\]]+)\](?:\(([^)]+)\))?\s*(?:\((\d{4}-\d{2}-\d{2})\)|-\s*(\d{4}-\d{2}-\d{2}))/
    );
    if (!m) continue;

    const version = m[1];
    if (seen.has(version)) continue; // deduplicate
    seen.add(version);

    const compareUrl = m[2] ?? undefined;
    const date = m[3] ?? m[4] ?? '';

    // Find ### section headers within this block
    const sections: ChangelogSection[] = [];
    let currentSection: ChangelogSection | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (/^### /.test(line)) {
        currentSection = { label: line.replace(/^### /, '').trim(), items: [] };
        sections.push(currentSection);
        continue;
      }

      if (currentSection && /^- /.test(line)) {
        const itemText = line.replace(/^- /, '');

        // Extract **scope**: prefix
        const scopeMatch = itemText.match(/^\*\*([^*]+)\*\*:\s*(.*)/);
        const scope = scopeMatch?.[1];
        const text = scopeMatch ? scopeMatch[2] : itemText;
        const commitReference = extractTrailingCommitReference(text);

        currentSection.items.push({
          text: commitReference.text,
          scope,
          commitHash: commitReference.commitHash,
          commitUrl: commitReference.commitUrl,
        });
      }
    }

    entries.push({
      version,
      date,
      compareUrl,
      sections,
      hasContent: sections.length > 0,
    });
  }

  return entries;
}

/**
 * Get the raw CHANGELOG.md content.
 * Fetches from public assets (works in browser and build time).
 * Result is cached after first read.
 */
export async function getChangelogContent(): Promise<string> {
  // Return cached version if available
  if (cachedChangelog !== null) {
    return cachedChangelog;
  }

  // Try to read from public assets (works in browser and at build time)
  try {
    const response = await fetch('/CHANGELOG.md');
    if (response.ok) {
      const content = await response.text();
      cachedChangelog = content;
      return content;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[getChangelog] Failed to fetch CHANGELOG.md:', error);
  }

  // Return empty string if fetch fails (graceful degradation)
  return '';
}

/**
 * Get the GitHub repository URL for changelog links.
 */
export const GITHUB_REPO_URL = 'https://github.com/alternun-development/alternun';
