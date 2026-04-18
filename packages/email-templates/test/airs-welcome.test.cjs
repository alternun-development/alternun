const assert = require('node:assert/strict');
const test = require('node:test');

const { renderAirsWelcomeEmail } = require('../dist/index.js');

test('renderAirsWelcomeEmail formats the onboarding email in Spanish', () => {
  assert.equal(typeof renderAirsWelcomeEmail, 'function');

  const email = renderAirsWelcomeEmail({
    locale: 'es-MX',
    displayName: 'Ada',
    dashboardUrl: 'https://airs.alternun.co',
    profileBonusAirs: 10,
    airsPerDollar: 5,
  });

  assert.equal(email.locale, 'es');
  assert.match(email.subject, /AIRS/i);
  assert.match(email.text, /Ada/);
  assert.match(email.text, /10 AIRS/);
  assert.match(email.text, /5 AIRS/);
  assert.match(email.html, /https:\/\/airs\.alternun\.co/);
});
