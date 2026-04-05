"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE = exports.RELEASE_SKIP_WAITING_MESSAGE_TYPE = exports.RELEASE_CHECK_MESSAGE_TYPE = exports.RELEASE_WORKER_FILENAME = exports.RELEASE_MANIFEST_FILENAME = void 0;
exports.renderReleaseWorkerSource = renderReleaseWorkerSource;
const manifest_1 = require("./manifest");
exports.RELEASE_MANIFEST_FILENAME = 'alternun-release-manifest.json';
exports.RELEASE_WORKER_FILENAME = 'alternun-release-worker.js';
exports.RELEASE_CHECK_MESSAGE_TYPE = 'ALTERNUN_RELEASE_CHECK';
exports.RELEASE_SKIP_WAITING_MESSAGE_TYPE = 'ALTERNUN_RELEASE_SKIP_WAITING';
exports.RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE = 'ALTERNUN_RELEASE_UPDATE_AVAILABLE';
function renderReleaseWorkerSource(options) {
    var _a;
    const currentVersion = JSON.stringify((0, manifest_1.normalizeReleaseVersion)(options.currentVersion));
    const manifestUrl = JSON.stringify((_a = options.manifestUrl) !== null && _a !== void 0 ? _a : `/${exports.RELEASE_MANIFEST_FILENAME}`);
    return `/* eslint-disable no-restricted-globals */
const CURRENT_VERSION = ${currentVersion};
const MANIFEST_URL = ${manifestUrl};
const CHECK_MESSAGE_TYPE = ${JSON.stringify(exports.RELEASE_CHECK_MESSAGE_TYPE)};
const SKIP_WAITING_MESSAGE_TYPE = ${JSON.stringify(exports.RELEASE_SKIP_WAITING_MESSAGE_TYPE)};
const UPDATE_AVAILABLE_MESSAGE_TYPE = ${JSON.stringify(exports.RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE)};

async function notifyClients(nextVersion) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: UPDATE_AVAILABLE_MESSAGE_TYPE,
      currentVersion: CURRENT_VERSION,
      nextVersion,
      manifestUrl: MANIFEST_URL,
    });
  }
}

async function checkForUpdate() {
  const response = await fetch(MANIFEST_URL, {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    return false;
  }

  const manifest = await response.json();
  const nextVersion =
    manifest && typeof manifest.version === 'string' ? manifest.version.trim() : '';

  if (!nextVersion || nextVersion === CURRENT_VERSION) {
    return false;
  }

  await notifyClients(nextVersion);
  return true;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;

  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === SKIP_WAITING_MESSAGE_TYPE) {
    self.skipWaiting();
    return;
  }

  if (data.type === CHECK_MESSAGE_TYPE) {
    event.waitUntil(checkForUpdate().catch(() => false));
  }
});
`;
}
