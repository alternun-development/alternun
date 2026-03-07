const assert = require('node:assert/strict');
const i18n = require('../dist/index.js');

function collectPaths(node, prefix = '') {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    return [prefix];
  }

  return Object.entries(node).flatMap(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return collectPaths(value, nextPrefix);
  });
}

const spanishMobile = i18n.createTranslator({
  locale: 'es-MX',
  namespace: 'mobile',
});

assert.equal(spanishMobile.locale, 'es');
assert.equal(spanishMobile.t('settingsScreen.title'), 'Configuracion');
assert.equal(spanishMobile.t('labels.theme'), 'Tema');
assert.equal(spanishMobile.t('labels.dark'), 'Oscuro');
assert.equal(spanishMobile.t('missing.key'), 'missing.key');

assert.equal(i18n.getLocaleLabel('th', 'es'), 'Tailandes');
assert.equal(
  i18n.translate({
    locale: 'en',
    namespace: 'shared',
    key: 'templates.welcome',
    params: { name: 'Ed', },
  }),
  'Welcome, Ed',
);

const webMessages = i18n.resolveMessages({
  locale: 'en',
  namespace: 'web',
});

assert.equal(webMessages.labels.signIn, 'Sign In');
assert.equal(webMessages.home.title, 'Alternun Web Application');

const localePaths = Object.fromEntries(
  Object.entries(i18n.rawCatalogs).map(([locale, catalog]) => [
    locale,
    collectPaths(catalog).sort(),
  ]),
);

assert.deepEqual(localePaths.es, localePaths.en);
assert.deepEqual(localePaths.th, localePaths.en);

console.log('i18n runtime smoke test passed');
