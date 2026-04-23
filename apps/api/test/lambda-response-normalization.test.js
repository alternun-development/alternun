const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const lambdaPath = path.resolve('src/lambda.ts');

test('lambda proxy response normalizes set-cookie into the v2 cookies field', () => {
  const source = fs.readFileSync(lambdaPath, 'utf8');

  assert.match(source, /export function normalizeLambdaResponseHeaders\(/);
  assert.match(source, /normalizedName === 'set-cookie'/);
  assert.match(source, /cookies: string\[\] = \[\]/);
  assert.match(source, /HOP_BY_HOP_HEADERS/);
  assert.match(source, /normalizedName === 'content-length' \|\| normalizedName === 'host' \|\| HOP_BY_HOP_HEADERS\.has\(normalizedName\)/);
  assert.match(source, /headers: responseEnvelope\.headers/);
  assert.match(source, /cookies: responseEnvelope\.cookies/);
  assert.match(source, /headers: Record<string, string>/);
});
