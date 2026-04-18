const assert = require('node:assert/strict');
const test = require('node:test');

const {
  mintIssuerJwt,
  verifyIssuerJwt,
} = require('../src/modules/auth-exchange/auth-exchange-jwt.ts');

test('verifyIssuerJwt validates AIRS session tokens signed by the backend', () => {
  const { token, claims } = mintIssuerJwt({
    issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
    audience: 'alternun-app',
    principal: {
      issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
      subject: 'principal-123',
      email: 'ada@example.com',
      roles: ['authenticated'],
      metadata: {
        appUserId: 'user-123',
      },
    },
    claims: {},
    signingKey: 'test-signing-key',
    tokenUse: 'access',
  });

  const verified = verifyIssuerJwt(token, 'test-signing-key');

  assert.equal(verified.claims.principal_id, claims.principal_id);
  assert.equal(verified.claims.app_user_id, 'user-123');
  assert.equal(verified.claims.email, 'ada@example.com');
  assert.equal(verified.claims.token_use, 'access');
  assert.equal(verified.header.alg, 'HS256');
});

test('verifyIssuerJwt rejects tokens signed with a different key', () => {
  const { token } = mintIssuerJwt({
    issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
    audience: 'alternun-app',
    principal: {
      issuer: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
      subject: 'principal-123',
      email: 'ada@example.com',
      roles: ['authenticated'],
      metadata: {
        appUserId: 'user-123',
      },
    },
    claims: {},
    signingKey: 'test-signing-key',
    tokenUse: 'access',
  });

  assert.throws(() => verifyIssuerJwt(token, 'wrong-signing-key'), /signature/i);
});
