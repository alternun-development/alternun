const assert = require('node:assert/strict');
const test = require('node:test');

const { hidesTestnetOnly } = require('../src/modules/marketplace/marketplace-visibility.ts');

test('only the production stage hides the testnet-only catalog', () => {
  assert.equal(hidesTestnetOnly({ APP_STAGE: 'production' }), true);
  assert.equal(hidesTestnetOnly({ APP_STAGE: ' Production ' }), true);
  assert.equal(hidesTestnetOnly({ APP_STAGE: 'dev' }), false);
  assert.equal(hidesTestnetOnly({}), false);
});
