import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeChangelogFile, normalizeChangelogHeadings } from './changelog-headings.mjs';

test('minor and major release headings become level-two like patch headings', () => {
  const generated = [
    '# [1.2.0-dev.0](https://example.test/compare/v1.1.142...v1.2.0-dev.0) (2026-11-14)',
    '',
    '### Features',
    '',
    '## [1.1.142](https://example.test/compare/v1.1.141...v1.1.142) (2026-11-13)',
  ].join('\n');
  const normalized = normalizeChangelogHeadings(generated);
  assert.match(normalized, /^## \[1\.2\.0-dev\.0\]/m);
  assert.match(normalized, /^## \[1\.1\.142\]/m);
  assert.match(normalized, /^### Features$/m);
});

test('titles and section headings are left alone', () => {
  const text = '# Changelog\n\n### Bug Fixes\n\n# 2.0.0 (2027-01-01)\n';
  assert.equal(normalizeChangelogHeadings(text), '# Changelog\n\n### Bug Fixes\n\n## 2.0.0 (2027-01-01)\n');
});

test('the file is only rewritten when a heading changes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-headings-'));
  const file = path.join(dir, 'CHANGELOG.md');
  fs.writeFileSync(file, '## [1.1.0](x) (2026-01-01)\n');
  assert.equal(normalizeChangelogFile(file), false);
  fs.writeFileSync(file, '# [1.2.0](x) (2026-01-01)\n');
  assert.equal(normalizeChangelogFile(file), true);
  assert.equal(fs.readFileSync(file, 'utf8'), '## [1.2.0](x) (2026-01-01)\n');
  assert.equal(normalizeChangelogFile(path.join(dir, 'missing.md')), false);
});
