import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderProductionChangelogBlock,
  replaceVersionBlocks,
} from './publish-production-changelog.mjs';

void test('publishes one production-range block with scoped release commits', () => {
  const block = renderProductionChangelogBlock({
    version: '1.1.43',
    previousTag: 'v1.1.42',
    date: '2026-08-20',
    repositoryUrl: 'https://github.com/alternun-development/alternun',
    commits: [
      {
        hash: '55860e3247ddcccbd51aac36083827407c9938d0',
        subject: 'fix(mobile): DashboardSummaryCards',
      },
      {
        hash: '6dfe34627a1e6050bff362c4224a7d3b78bf6731',
        subject: 'fix(infra): preserve identity recovery aliases',
      },
      { hash: '7b251b68104e59dfb2edff9b2f1adf8d62ffb3f6', subject: 'chore: release v1.1.43' },
    ],
  });

  const result = replaceVersionBlocks(
    `## [1.1.43](https://example.com/compare/v1.1.43-dev.1...v1.1.43) (2026-08-20)\n\n### Bug Fixes\n\n- **repo:** release\n\n## [1.1.42](https://example.com) (2026-08-19)\n`,
    '1.1.43',
    block
  );

  assert.match(result, /compare\/v1\.1\.42\.\.\.v1\.1\.43/);
  assert.match(result, /\*\*mobile:\*\* DashboardSummaryCards/);
  assert.match(result, /\*\*infra:\*\* preserve identity recovery aliases/);
  assert.doesNotMatch(result, /\*\*repo:\*\* release/);
  assert.equal((result.match(/^## \[1\.1\.43\]/gm) ?? []).length, 1);
});
