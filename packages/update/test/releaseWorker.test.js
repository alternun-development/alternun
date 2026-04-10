const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');

const {
  RELEASE_CHECK_MESSAGE_TYPE,
  RELEASE_SKIP_WAITING_MESSAGE_TYPE,
  RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE,
  renderReleaseWorkerSource,
} = require('../dist/index.js');

function createWorkerHarness({
  currentVersion = '1.0.0',
  manifestVersion = '1.0.1',
  manifestUrl = '/alternun-release-manifest.json',
} = {}) {
  const messages = [];
  let skipWaitingCalled = false;
  let clientsClaimCalled = false;
  const listeners = {};

  const self = {
    clients: {
      matchAll: async () => [
        {
          postMessage: (message) => {
            messages.push(message);
          },
        },
      ],
      claim: async () => {
        clientsClaimCalled = true;
      },
    },
    skipWaiting: () => {
      skipWaitingCalled = true;
    },
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
  };

  const fetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ version: manifestVersion }),
  });

  vm.runInNewContext(
    renderReleaseWorkerSource({ currentVersion, manifestUrl }),
    {
      self,
      fetch,
      console,
      URL,
      Promise,
    },
    { filename: 'alternun-release-worker.js' }
  );

  async function dispatch(type, data) {
    const waits = [];
    const event = {
      data,
      waitUntil: (promise) => {
        waits.push(Promise.resolve(promise));
      },
    };

    if (!listeners[type]) {
      throw new Error(`Missing worker listener: ${type}`);
    }

    listeners[type](event);
    await Promise.all(waits);
  }

  return {
    dispatch,
    messages,
    get skipWaitingCalled() {
      return skipWaitingCalled;
    },
    get clientsClaimCalled() {
      return clientsClaimCalled;
    },
  };
}

test('release worker emits update available when manifest version changes', async () => {
  const harness = createWorkerHarness({
    currentVersion: '1.0.0',
    manifestVersion: '1.0.1',
  });

  await harness.dispatch('message', {
    type: RELEASE_CHECK_MESSAGE_TYPE,
  });

  assert.equal(harness.messages.length, 1);
  assert.equal(harness.messages[0].type, RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE);
  assert.equal(harness.messages[0].currentVersion, '1.0.0');
  assert.equal(harness.messages[0].nextVersion, '1.0.1');
  assert.equal(harness.messages[0].manifestUrl, '/alternun-release-manifest.json');
});

test('release worker ignores matching manifest versions', async () => {
  const harness = createWorkerHarness({
    currentVersion: '1.0.0',
    manifestVersion: '1.0.0',
  });

  await harness.dispatch('message', {
    type: RELEASE_CHECK_MESSAGE_TYPE,
  });

  assert.equal(harness.messages.length, 0);
});

test('release worker honors install, activate, and skip waiting messages', async () => {
  const harness = createWorkerHarness();

  await harness.dispatch('install');
  await harness.dispatch('activate', {});
  await harness.dispatch('message', {
    type: RELEASE_SKIP_WAITING_MESSAGE_TYPE,
  });

  assert.equal(harness.skipWaitingCalled, true);
  assert.equal(harness.clientsClaimCalled, true);
});
