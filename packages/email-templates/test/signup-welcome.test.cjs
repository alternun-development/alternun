const assert = require('node:assert/strict');
const test = require('node:test');

const { renderSignupWelcomeEmail } = require('../dist/index.js');

const BANNED = /AIRS|Alternun AIRS|\bRBI\b|\bATN\b|verific|compens|renta|billetera|wallet|sustentable|puntos|Bienvenido/;

test('the sign-up welcome uses the Airs copy, in Spanish by default', () => {
  const email = renderSignupWelcomeEmail({ displayName: 'Ada' });

  assert.equal(email.locale, 'es');
  assert.equal(email.subject, 'Tu cuenta de Airs está lista');
  assert.equal(email.greeting, 'Hola, Ada:');
  assert.match(email.text, /Gracias por unirte a Airs/);
  assert.doesNotMatch(`${email.text}\n${email.html}`, BANNED);
});

test('the sign-up welcome greets without a name, and English keeps the same rules', () => {
  assert.equal(renderSignupWelcomeEmail({ displayName: ' ' }).greeting, 'Hola:');
  const en = renderSignupWelcomeEmail({ locale: 'en' });
  assert.equal(en.subject, 'Your Airs account is ready');
  assert.equal(en.greeting, 'Hi,');
  assert.doesNotMatch(`${en.text}\n${en.html}`, BANNED);
});
