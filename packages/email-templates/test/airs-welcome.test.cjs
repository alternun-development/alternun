const assert = require('node:assert/strict');
const test = require('node:test');

const { renderAirsWelcomeEmail } = require('../dist/index.js');

const BANNED = /AIRS|\bRBI\b|\bATN\b|verific|compens|renta|riqueza|beneficios económicos|puntos|por cada USD/;

test('the welcome email v2 uses the Email01 design and the Airs copy in Spanish', () => {
  const email = renderAirsWelcomeEmail({
    locale: 'es-MX',
    displayName: 'Ada',
    dashboardUrl: 'https://airs.alternun.co/',
    bonusAirs: 10,
  });

  assert.equal(email.locale, 'es');
  assert.equal(email.subject, 'Te damos la bienvenida a Airs');
  assert.equal(email.greeting, 'Hola, Ada:');
  assert.match(email.text, /suma tus primeros 10 Airs/);
  assert.match(email.html, /welcome-v2\/banner\.jpg/);
  assert.match(email.html, /welcome-v2\/footer\.jpg/);
  assert.match(email.html, /href="https:\/\/airs\.alternun\.co\/profile"/);
  assert.match(email.html, /Que lo que haces por el planeta, quede\./);
  assert.match(email.text, /Alternun Colombia SAS/);
  assert.doesNotMatch(`${email.text}\n${email.html}`, BANNED);
});

test('the welcome email defaults to Spanish, greets without a name and escapes it', () => {
  assert.equal(renderAirsWelcomeEmail({}).locale, 'es');
  assert.equal(renderAirsWelcomeEmail({ displayName: '  ' }).greeting, 'Hola:');
  const hostile = renderAirsWelcomeEmail({ displayName: '<b>Bob</b>' });
  assert.doesNotMatch(hostile.html, /<b>Bob<\/b>/);
  assert.match(hostile.html, /&lt;b&gt;Bob&lt;\/b&gt;/);
});

test('English and Thai keep the same rules', () => {
  const en = renderAirsWelcomeEmail({ locale: 'en', displayName: 'Ada' });
  assert.equal(en.subject, 'Welcome to Airs');
  assert.match(en.text, /What you do for the planet, stays\./);
  assert.doesNotMatch(`${en.text}\n${en.html}`, /AIRS|verif|offset|income/);
  const th = renderAirsWelcomeEmail({ locale: 'th' });
  assert.equal(th.locale, 'th');
  assert.match(th.subject, /Airs/);
});
