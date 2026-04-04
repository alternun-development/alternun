import { normalizeReleaseVersion } from './manifest';

export const RELEASE_MANIFEST_FILENAME = 'alternun-release-manifest.json';
export const RELEASE_WORKER_FILENAME = 'alternun-release-worker.js';
export const RELEASE_CHECK_MESSAGE_TYPE = 'ALTERNUN_RELEASE_CHECK';
export const RELEASE_SKIP_WAITING_MESSAGE_TYPE = 'ALTERNUN_RELEASE_SKIP_WAITING';
export const RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE = 'ALTERNUN_RELEASE_UPDATE_AVAILABLE';

export interface RenderReleaseWorkerOptions {
  currentVersion: string;
  manifestUrl?: string;
}

export function renderReleaseWorkerSource(options: RenderReleaseWorkerOptions): string {
  const currentVersion = JSON.stringify(normalizeReleaseVersion(options.currentVersion));
  const manifestUrl = JSON.stringify(options.manifestUrl ?? `/${RELEASE_MANIFEST_FILENAME}`);

  return `/* eslint-disable no-restricted-globals */
const CURRENT_VERSION = ${currentVersion};
const MANIFEST_URL = ${manifestUrl};
const CHECK_MESSAGE_TYPE = ${JSON.stringify(RELEASE_CHECK_MESSAGE_TYPE)};
const SKIP_WAITING_MESSAGE_TYPE = ${JSON.stringify(RELEASE_SKIP_WAITING_MESSAGE_TYPE)};
const UPDATE_AVAILABLE_MESSAGE_TYPE = ${JSON.stringify(RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE)};

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
