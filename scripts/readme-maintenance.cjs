const fs = require('node:fs');
const path = require('node:path');

const {
  readRootVersion,
  resolveVersionContextBranch,
  stripVersionSuffix,
} = require('./versioning/version-files.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(REPO_ROOT, 'README.md');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'CHANGELOG.md');
const SUPPORT_EMAIL = 'support@alternun.co';
const LEGACY_SUPPORT_EMAIL = 'support@alternun.io';
const RELEASES_URL = 'https://github.com/alternun-development/alternun/releases';

function normalizeEol(text) {
  return String(text).replace(/\r\n/g, '\n');
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function displayVersion(version) {
  return stripVersionSuffix(version) || version;
}

function readTextFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function parseChangelogBlocks(changelogContent) {
  const lines = normalizeEol(changelogContent).split('\n');
  const headerPattern = /^##\s+\[?v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\]?.*$/;
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(headerPattern);
    if (match) {
      if (current) {
        blocks.push(current);
      }

      current = {
        version: match[1],
        header: line,
        lines: [],
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    blocks.push(current);
  }

  return blocks;
}

function selectChangelogBlock(changelogContent, version) {
  const targetVersion = displayVersion(version);
  const blocks = parseChangelogBlocks(changelogContent);
  return blocks.find((block) => displayVersion(block.version) === targetVersion) || null;
}

function normalizeBlockLines(lines) {
  const copy = [...lines];

  while (copy.length > 0 && copy[0].trim() === '') {
    copy.shift();
  }

  while (copy.length > 0 && copy[copy.length - 1].trim() === '') {
    copy.pop();
  }

  return copy;
}

function renderLatestChangesSection({ version, changelogBody }) {
  return [
    `## 📋 Latest Changes (v${displayVersion(version)})`,
    '',
    changelogBody,
    '',
    `For full version history, see [CHANGELOG.md](./CHANGELOG.md) and [GitHub releases](${RELEASES_URL})`,
    '',
  ].join('\n');
}

function replaceCurrentVersionLine(readmeContent, version) {
  const expectedVersion = displayVersion(version);
  const versionLinePattern = /^Current version:\s+\*\*[^*]+\*\*$/m;

  if (!versionLinePattern.test(readmeContent)) {
    throw new Error('README is missing the "Current version" line.');
  }

  return readmeContent.replace(versionLinePattern, `Current version: **${expectedVersion}**`);
}

function replaceSupportEmail(readmeContent) {
  const updated = readmeContent.replaceAll(LEGACY_SUPPORT_EMAIL, SUPPORT_EMAIL);

  if (!updated.includes(SUPPORT_EMAIL)) {
    throw new Error('README support email line is missing.');
  }

  return updated;
}

function replaceLatestChangesSection(readmeContent, latestChangesSection) {
  const lines = normalizeEol(readmeContent).split('\n');
  const sectionHeaderPattern = /^##\s+(?:📋\s+)?Latest Changes(?:\s+\(v[^\)]*\))?\s*$/i;
  const securityHeaderPattern = /^##\s+Security\s*$/i;
  const startIndex = lines.findIndex((line) => sectionHeaderPattern.test(line));

  if (startIndex !== -1) {
    let endIndex = startIndex + 1;

    while (endIndex < lines.length && !/^##\s+/.test(lines[endIndex])) {
      endIndex += 1;
    }

    const updatedLines = [...lines.slice(0, startIndex), ...latestChangesSection.split('\n')];
    updatedLines.push(...lines.slice(endIndex));
    return updatedLines.join('\n');
  }

  const insertIndex = lines.findIndex((line) => securityHeaderPattern.test(line));
  if (insertIndex === -1) {
    return ensureTrailingNewline(`${normalizeEol(readmeContent)}\n\n${latestChangesSection}`);
  }

  const before = lines.slice(0, insertIndex);
  if (before.length > 0 && before[before.length - 1].trim() !== '') {
    before.push('');
  }

  return [...before, ...latestChangesSection.split('\n'), ...lines.slice(insertIndex)].join('\n');
}

function buildLatestChangesSection({ changelogContent, version }) {
  const block = selectChangelogBlock(changelogContent, version);

  if (!block) {
    throw new Error('CHANGELOG is missing a version block for the current release.');
  }

  const blockLines = normalizeBlockLines(block.lines);

  if (blockLines.length === 0) {
    throw new Error(`CHANGELOG block for v${displayVersion(version)} is empty.`);
  }

  return renderLatestChangesSection({
    version,
    changelogBody: blockLines.join('\n'),
  });
}

function updateReadmeContent(readmeContent, { version, changelogContent = null, includeLatestChanges = true } = {}) {
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('A version is required to update the README.');
  }

  let updated = normalizeEol(readmeContent);
  updated = replaceCurrentVersionLine(updated, version);
  updated = replaceSupportEmail(updated);

  if (includeLatestChanges) {
    if (typeof changelogContent !== 'string' || changelogContent.length === 0) {
      throw new Error('A changelog is required to refresh the README latest changes section.');
    }

    const latestChangesSection = buildLatestChangesSection({
      changelogContent,
      version,
    });

    updated = replaceLatestChangesSection(updated, latestChangesSection);
  }

  return ensureTrailingNewline(updated);
}

function syncReadmeFile({
  readmePath = README_PATH,
  changelogPath = CHANGELOG_PATH,
  version = readRootVersion(resolveVersionContextBranch()),
  includeLatestChanges = true,
  write = true,
} = {}) {
  const readmeContent = readTextFile(readmePath);

  if (readmeContent === null) {
    throw new Error(`README not found at ${readmePath}`);
  }

  let changelogContent = null;
  if (includeLatestChanges) {
    changelogContent = readTextFile(changelogPath);
    if (changelogContent === null) {
      throw new Error(`CHANGELOG not found at ${changelogPath}`);
    }
  }

  const updatedContent = updateReadmeContent(readmeContent, {
    version,
    changelogContent,
    includeLatestChanges,
  });

  const changed = updatedContent !== ensureTrailingNewline(normalizeEol(readmeContent));

  if (changed && write) {
    fs.writeFileSync(readmePath, updatedContent, 'utf8');
  }

  return {
    changed,
    readmePath,
    version: displayVersion(version),
    includeLatestChanges,
    updatedContent,
  };
}

function validateReadmeContent(readmeContent, { version = readRootVersion(), changelogContent = null } = {}) {
  const issues = [];
  const normalizedContent = normalizeEol(readmeContent);
  const expectedVersion = displayVersion(version);
  const versionLineMatch = normalizedContent.match(/^Current version:\s+\*\*([^*]+)\*\*$/m);
  const supportEmailPresent = normalizedContent.includes(SUPPORT_EMAIL);
  const legacySupportEmailPresent = normalizedContent.includes(LEGACY_SUPPORT_EMAIL);
  const latestChangesMatch = normalizedContent.match(
    /^##\s+(?:📋\s+)?Latest Changes(?:\s+\(v([^\)]+)\))?\s*$/im
  );

  if (!versionLineMatch) {
    issues.push('README is missing the current version line.');
  } else if (versionLineMatch[1] !== expectedVersion) {
    issues.push(`README Current version is ${versionLineMatch[1]} but expected ${expectedVersion}`);
  }

  if (!supportEmailPresent) {
    issues.push(`README support email must be ${SUPPORT_EMAIL}.`);
  }

  if (legacySupportEmailPresent) {
    issues.push(`README still references the legacy support email ${LEGACY_SUPPORT_EMAIL}.`);
  }

  if (typeof changelogContent === 'string' && changelogContent.length > 0) {
    const block = selectChangelogBlock(changelogContent, version);

    if (!block) {
      issues.push(`CHANGELOG is missing a version block for ${expectedVersion}.`);
    } else if (!latestChangesMatch) {
      issues.push('README is missing the Latest Changes section.');
    } else if (displayVersion(latestChangesMatch[1] || '') !== expectedVersion) {
      issues.push(
        `README Latest Changes section is v${latestChangesMatch[1] || 'unknown'} but expected v${expectedVersion}.`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function syncRootReadme(options = {}) {
  const branch =
    typeof options.branch === 'string' && options.branch.length > 0
      ? options.branch
      : resolveVersionContextBranch();
  const version =
    typeof options.version === 'string' && options.version.length > 0
      ? options.version
      : readRootVersion(branch);

  return syncReadmeFile({
    readmePath: options.readmePath || README_PATH,
    changelogPath: options.changelogPath || CHANGELOG_PATH,
    version,
    includeLatestChanges: options.includeLatestChanges !== false,
    write: options.write !== false,
  });
}

function checkRootReadme(options = {}) {
  const branch =
    typeof options.branch === 'string' && options.branch.length > 0
      ? options.branch
      : resolveVersionContextBranch();
  const version =
    typeof options.version === 'string' && options.version.length > 0
      ? options.version
      : readRootVersion(branch);
  const readmeContent = readTextFile(options.readmePath || README_PATH);

  if (readmeContent === null) {
    return {
      valid: false,
      issues: [`README not found at ${options.readmePath || README_PATH}`],
    };
  }

  const changelogContent = readTextFile(options.changelogPath || CHANGELOG_PATH);
  return validateReadmeContent(readmeContent, {
    version,
    changelogContent,
  });
}

module.exports = {
  README_PATH,
  CHANGELOG_PATH,
  SUPPORT_EMAIL,
  buildLatestChangesSection,
  checkRootReadme,
  displayVersion,
  renderLatestChangesSection,
  selectChangelogBlock,
  syncReadmeFile,
  syncRootReadme,
  updateReadmeContent,
  validateReadmeContent,
};
