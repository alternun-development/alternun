const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { encodeLambdaResponseBody, normalizeLambdaRequestHeaders } = require('../src/lambda.ts');

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

test('lambda proxy forwards API Gateway source IP as Fastify remoteAddress', () => {
  const source = fs.readFileSync(lambdaPath, 'utf8');
  assert.match(source, /event\.requestContext\?\.http\?\.sourceIp\?\.trim\(\)/);
  assert.match(source, /remoteAddress \? \{ remoteAddress \} : \{\}/);
});

test('lambda proxy returns binary bodies (proof images, PDFs) base64-encoded and intact', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0x80]);
  for (const type of ['image/png', 'application/pdf', 'application/octet-stream']) {
    const encoded = encodeLambdaResponseBody(type, png);
    assert.equal(encoded.isBase64Encoded, true, type);
    assert.deepEqual(Buffer.from(encoded.body, 'base64'), png, type);
  }
});

test('lambda proxy keeps text bodies as plain text', () => {
  const json = Buffer.from('{"ok":"sí"}');
  for (const type of [
    'application/json; charset=utf-8',
    'text/html',
    'application/problem+json',
    'image/svg+xml',
    undefined,
  ]) {
    assert.deepEqual(encodeLambdaResponseBody(type, json), {
      body: '{"ok":"sí"}',
      isBase64Encoded: false,
    });
  }
});
