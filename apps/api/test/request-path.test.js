const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeLambdaRequestPath } = require('../src/common/bootstrap/request-path.ts');

test('normalizeLambdaRequestPath preserves version-neutral auth routes', () => {
  assert.equal(normalizeLambdaRequestPath('/auth/sign-in/social'), '/auth/sign-in/social');
  assert.equal(normalizeLambdaRequestPath('/auth/exchange'), '/auth/exchange');
  assert.equal(normalizeLambdaRequestPath('/authentik/webhook'), '/authentik/webhook');
  assert.equal(normalizeLambdaRequestPath('/airs/me'), '/airs/me');
  assert.equal(normalizeLambdaRequestPath('/activity/feed'), '/activity/feed');
  assert.equal(normalizeLambdaRequestPath('/decap/public'), '/decap/public');
});

test('normalizeLambdaRequestPath prepends v1 for versioned api routes', () => {
  assert.equal(normalizeLambdaRequestPath('/health'), '/v1/health');
  assert.equal(normalizeLambdaRequestPath('/legal/terms'), '/v1/legal/terms');
  assert.equal(normalizeLambdaRequestPath('/v1/health'), '/v1/health');
});
