const assert = require('node:assert/strict');
const test = require('node:test');

const { computePinDigest, verifyPinDigest } = require('../src/modules/wallet/wallet-pin.ts');

// Cross-implementation fixture: this exact {pin, salt, hash} triple was captured from
// packages/wallet's createPinDigest('123456') (WebCrypto PBKDF2 path), see
// .agents/active-tasks/alternun-wallet-system/02-server-wallet-module-api.md for how it was
// produced. If this test ever fails, the server and client PIN digest implementations have
// drifted apart and the verify-pin gate will reject correct PINs for real users.
const FIXTURE = {
  pin: '123456',
  salt: '/Q4DsWzmtIO7VhqUROpkPw==',
  hash: 'SLWtGlHpyfd/k5bgHj0Q7N6cDzN1oi4u3vFmBIoZHqg=',
};

test('computePinDigest matches the known-good client (WebCrypto) fixture', () => {
  assert.equal(computePinDigest(FIXTURE.pin, FIXTURE.salt), FIXTURE.hash);
});

test('verifyPinDigest accepts the correct PIN against the fixture', () => {
  assert.equal(verifyPinDigest(FIXTURE.pin, FIXTURE.salt, FIXTURE.hash), true);
});

test('verifyPinDigest rejects an incorrect PIN against the fixture', () => {
  assert.equal(verifyPinDigest('000000', FIXTURE.salt, FIXTURE.hash), false);
});

test('verifyPinDigest rejects a tampered hash', () => {
  const tamperedHash = FIXTURE.hash.replace(/^./, FIXTURE.hash[0] === 'A' ? 'B' : 'A');
  assert.equal(verifyPinDigest(FIXTURE.pin, FIXTURE.salt, tamperedHash), false);
});
