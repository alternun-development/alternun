const assert = require('node:assert/strict');
const test = require('node:test');

const { LegalService } = require('../src/modules/legal/legal.service.ts');

test('loads localized terms from the Docusaurus page translations', () => {
  const service = new LegalService();

  for (const locale of ['es', 'th']) {
    const content = service.getContent('terms', locale);

    assert.equal(content.locale, locale);
    assert.equal(content.type, 'terms');
    assert.ok(content.content.length > 0);
  }
});
