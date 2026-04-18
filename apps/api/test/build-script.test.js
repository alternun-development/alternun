const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const buildScriptPath = path.resolve(__dirname, '../build.sh');

test('api build script builds email templates before compiling the Lambda bundle', () => {
  const source = fs.readFileSync(buildScriptPath, 'utf8');

  assert.match(source, /pnpm --filter @alternun\/email-templates run build/);
  assert.match(source, /tsc -p tsconfig\.build\.json/);
  assert.match(source, /esbuild "\$\{lambda_entry\}"/);
});
