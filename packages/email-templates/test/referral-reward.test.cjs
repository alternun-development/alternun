const assert = require('node:assert/strict');
const test = require('node:test');

const { renderReferralRewardEmail } = require('../dist/index.js');

test('referral reward emails identify both people and their credited AIRS', () => {
  const referrerEmail = renderReferralRewardEmail({
    locale: 'es-CO',
    recipientName: 'María',
    counterpartName: 'Edward',
    recipientRole: 'referrer',
    recipientAirs: 10,
    counterpartAirs: 10,
  });
  const refereeEmail = renderReferralRewardEmail({
    locale: 'th-TH',
    recipientName: 'Edward',
    counterpartName: 'María',
    recipientRole: 'referee',
    recipientAirs: 10,
    counterpartAirs: 10,
  });

  assert.equal(referrerEmail.locale, 'es');
  assert.match(referrerEmail.text, /María/);
  assert.match(referrerEmail.text, /Edward/);
  assert.match(referrerEmail.text, /10 AIRS/);
  assert.equal(refereeEmail.locale, 'th');
  assert.match(refereeEmail.text, /Edward/);
  assert.match(refereeEmail.text, /María/);
  assert.match(refereeEmail.html, /10 AIRS/);
});
