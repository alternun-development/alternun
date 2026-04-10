const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  buildReleaseManifestJson,
  isReleaseUpdateEnabled,
  resolveReleaseUpdateRuntime,
} = require('../dist/index.js');

test('resolves release assets from an explicit origin', () => {
  const runtime = resolveReleaseUpdateRuntime({
    origin: 'https://preview.sso.alternun.co',
  });

  assert.equal(runtime.origin, 'https://preview.sso.alternun.co');
  assert.equal(runtime.hostname, 'preview.sso.alternun.co');
  assert.equal(
    runtime.manifestUrl,
    'https://preview.sso.alternun.co/alternun-release-manifest.json'
  );
  assert.equal(runtime.workerUrl, 'https://preview.sso.alternun.co/alternun-release-worker.js');
});

test('keeps explicit asset overrides intact', () => {
  const runtime = resolveReleaseUpdateRuntime({
    origin: 'https://preview.sso.alternun.co',
    manifestUrl: 'https://cdn.example.com/release-manifest.json',
    workerUrl: '/custom-worker.js',
  });

  assert.equal(runtime.manifestUrl, 'https://cdn.example.com/release-manifest.json');
  assert.equal(runtime.workerUrl, '/custom-worker.js');
});

test('disables auto mode for loopback hosts but allows on mode', () => {
  assert.equal(isReleaseUpdateEnabled('auto', 'localhost'), false);
  assert.equal(isReleaseUpdateEnabled('auto', 'preview.sso.alternun.co'), true);
  assert.equal(isReleaseUpdateEnabled('on', 'localhost'), true);
});

test('serializes release manifests with a trailing newline', () => {
  assert.equal(buildReleaseManifestJson('1.2.3'), '{\n  "version": "1.2.3"\n}\n');
});
