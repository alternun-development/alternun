const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('api fastify stack uses the patched middie release', () => {
  const apiPackage = readJson(path.resolve(__dirname, '..', 'package.json'));
  const rootPackage = readJson(path.resolve(__dirname, '..', '..', '..', 'package.json'));

  assert.match(apiPackage.dependencies.fastify, /^4\./);
  assert.equal(rootPackage.pnpm.overrides['@fastify/middie'], '9.3.2');
});
