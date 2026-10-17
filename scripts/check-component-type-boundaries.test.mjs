import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectTopLevelTypeNames,
  isComponentSource,
  validateTypeBoundary,
} from './check-component-type-boundaries.mjs';

test('collects top-level interfaces and type aliases from TypeScript', () => {
  assert.deepEqual(
    collectTopLevelTypeNames('export interface CardProps {}\nexport type CardSize = "sm";'),
    ['CardProps', 'CardSize']
  );
});

test('flags component-local top-level types as well as exported types', () => {
  assert.deepEqual(
    validateTypeBoundary(
      'apps/mobile/components/marketplace/Card.tsx',
      '',
      'interface CardProps {}\ntype CardState = "idle" | "busy";'
    ),
    [
      { filePath: 'apps/mobile/components/marketplace/Card.tsx', name: 'CardProps' },
      { filePath: 'apps/mobile/components/marketplace/Card.tsx', name: 'CardState' },
    ]
  );
});

test('flags newly exported types in component files', () => {
  assert.deepEqual(
    validateTypeBoundary(
      'apps/mobile/components/marketplace/Card.tsx',
      '',
      'export interface MarketplaceProject {}'
    ),
    [{ filePath: 'apps/mobile/components/marketplace/Card.tsx', name: 'MarketplaceProject' }]
  );
});

test('does not flag existing declarations when a legacy component is edited', () => {
  const source = 'export interface LegacyProps {}';
  assert.deepEqual(
    validateTypeBoundary('apps/mobile/components/legacy/Legacy.tsx', source, source),
    []
  );
});

test('allows declarations in dedicated type files and excludes tests', () => {
  assert.equal(isComponentSource('apps/mobile/components/marketplace/types.ts'), false);
  assert.equal(isComponentSource('apps/mobile/components/marketplace/Card.test.tsx'), false);
  assert.equal(isComponentSource('apps/mobile/components/marketplace/Card.tsx'), true);
  assert.equal(isComponentSource('apps/mobile/app/explorar/[slug].tsx'), true);
});
