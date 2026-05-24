const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { normalizeLambdaRequestHeaders } = require('../src/lambda.ts');

const lambdaPath = path.resolve('src/lambda.ts');

test('lambda proxy response normalizes set-cookie into the v2 cookies field', () => {
  const source = fs.readFileSync(lambdaPath, 'utf8');

  assert.match(source, /export function normalizeLambdaResponseHeaders\(/);
  assert.match(source, /normalizedName === 'set-cookie'/);
  assert.match(source, /cookies: string\[\] = \[\]/);
  assert.match(source, /HOP_BY_HOP_HEADERS/);
  assert.match(
    source,
    /normalizedName === 'content-length'[\s\S]*normalizedName === 'host'[\s\S]*HOP_BY_HOP_HEADERS\.has\(normalizedName\)/
  );
  assert.match(source, /headers: responseEnvelope\.headers/);
  assert.match(
    source,
    /responseEnvelope\.cookies \? \{ cookies: responseEnvelope\.cookies \} : \{\}/
  );
  assert.match(source, /headers: Record<string, string>/);
});

test('lambda proxy request forwards API Gateway v2 cookies to Fastify', () => {
  const headers = normalizeLambdaRequestHeaders({
    headers: {
      host: 'testnet.api.alternun.co',
      cookie: 'existing=1',
      'content-length': '100',
    },
    cookies: ['__Secure-better-auth.session_token=abc', 'other=two'],
  });

  assert.equal(headers.host, 'testnet.api.alternun.co');
  assert.equal(headers.cookie, 'existing=1; __Secure-better-auth.session_token=abc; other=two');
  assert.equal(headers['content-length'], undefined);
});
