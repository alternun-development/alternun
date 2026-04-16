import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RELEASE_CHECK_MESSAGE_TYPE,
  RELEASE_MANIFEST_FILENAME,
  RELEASE_SKIP_WAITING_MESSAGE_TYPE,
  RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE,
  RELEASE_WORKER_FILENAME,
  renderReleaseWorkerSource,
} from './service-worker';
import {
  normalizeReleaseVersion,
  parseReleaseManifest,
  serializeReleaseManifest,
  compareReleaseVersions,
  type ReleaseManifest,
} from './manifest';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DEFAULT_STORAGE_KEY = 'alternun.release.dismissed-version';
const DEFAULT_MANIFEST_URL = `/${RELEASE_MANIFEST_FILENAME}`;
const DEFAULT_WORKER_URL = '/alternun-release-worker.js';
const DEFAULT_POLL_INTERVAL_MS = (() => {
  const envInterval =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS : undefined;
  if (envInterval) {
    const parsed = parseInt(envInterval, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 5 * 60 * 1000; // 5 minutes default for production
})();
const dismissedVersionsInMemory = new Map<string, string>();

export type ReleaseUpdateMode = 'auto' | 'on' | 'off';

export interface ReleaseUpdateOptions {
  currentVersion: string;
  mode?: string | null;
  manifestUrl?: string;
  workerUrl?: string;
  appOrigin?: string | null;
  pollIntervalMs?: number;
  storageKey?: string;
  onReload?: () => void;
}

export interface ReleaseUpdateRuntime {
  origin: string | null;
  hostname: string | null;
  manifestUrl: string;
  workerUrl: string;
}

export interface ReleaseUpdateState {
  enabled: boolean;
  checking: boolean;
  available: boolean;
  currentVersion: string;
  remoteVersion: string | null;
  error: string | null;
  lastCheckedAt: number | null;
  refresh: () => Promise<void>;
  dismiss: () => void;
  reload: () => void;
}

export function normalizeReleaseUpdateMode(value: string | null | undefined): ReleaseUpdateMode {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'on' || normalized === 'off' || normalized === 'auto') {
    return normalized;
  }

  return 'auto';
}

export function isReleaseUpdateEnabled(mode: ReleaseUpdateMode, hostname?: string | null): boolean {
  if (mode === 'on') {
    return true;
  }

  if (mode === 'off') {
    return false;
  }

  const normalizedHostname = (hostname ?? '').trim().toLowerCase();
  return !LOOPBACK_HOSTNAMES.has(normalizedHostname);
}

function trimReleaseValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveRuntimeOrigin(explicitOrigin?: string | null): string | null {
  const trimmedExplicitOrigin = trimReleaseValue(explicitOrigin);
  if (trimmedExplicitOrigin) {
    return trimmedExplicitOrigin;
  }

  if (typeof window !== 'undefined') {
    const browserOrigin = trimReleaseValue(window.location.origin);
    if (browserOrigin) {
      return browserOrigin;
    }
  }

  return (
    trimReleaseValue(process.env.EXPO_PUBLIC_ORIGIN) ??
    trimReleaseValue(process.env.NEXT_PUBLIC_ORIGIN)
  );
}

function resolveRuntimeHostname(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).hostname.trim().toLowerCase();
  } catch {
    return origin.trim().toLowerCase();
  }
}

function resolveReleaseAssetUrl(
  fileName: string,
  explicitUrl: string | undefined,
  origin: string | null,
  fallbackUrl: string
): string {
  const trimmedExplicitUrl = trimReleaseValue(explicitUrl);
  if (trimmedExplicitUrl) {
    return trimmedExplicitUrl;
  }

  if (origin) {
    try {
      return new URL(fileName, origin).toString();
    } catch {
      // Fall through to the local fallback path.
    }
  }

  return fallbackUrl;
}

export function resolveReleaseUpdateRuntime({
  origin,
  manifestUrl,
  workerUrl,
}: {
  origin?: string | null;
  manifestUrl?: string | null;
  workerUrl?: string | null;
} = {}): ReleaseUpdateRuntime {
  const resolvedOrigin = resolveRuntimeOrigin(origin);

  return {
    origin: resolvedOrigin,
    hostname: resolveRuntimeHostname(resolvedOrigin),
    manifestUrl: resolveReleaseAssetUrl(
      RELEASE_MANIFEST_FILENAME,
      manifestUrl ?? undefined,
      resolvedOrigin,
      DEFAULT_MANIFEST_URL
    ),
    workerUrl: resolveReleaseAssetUrl(
      RELEASE_WORKER_FILENAME,
      workerUrl ?? undefined,
      resolvedOrigin,
      DEFAULT_WORKER_URL
    ),
  };
}

function readStoredDismissedVersion(storageKey: string): string | null {
  if (typeof window === 'undefined') {
    return dismissedVersionsInMemory.get(storageKey) ?? null;
  }

  try {
    const value = window.localStorage.getItem(storageKey);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function writeStoredDismissedVersion(storageKey: string, version: string): void {
  if (typeof window === 'undefined') {
    dismissedVersionsInMemory.set(storageKey, version);
    return;
  }

  try {
    window.localStorage.setItem(storageKey, version);
  } catch {
    // Intentionally ignore storage failures.
  }
}

function createUpdateManifest(version: string): ReleaseManifest {
  return { version: normalizeReleaseVersion(version) };
}

export function buildReleaseManifestJson(version: string): string {
  return serializeReleaseManifest(createUpdateManifest(version));
}

export function buildReleaseWorkerSource(
  currentVersion: string,
  manifestUrl = DEFAULT_MANIFEST_URL
): string {
  return renderReleaseWorkerSource({
    currentVersion,
    manifestUrl,
  });
}

export function useReleaseUpdate({
  currentVersion,
  mode,
  manifestUrl = DEFAULT_MANIFEST_URL,
  workerUrl = DEFAULT_WORKER_URL,
  appOrigin,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  storageKey = DEFAULT_STORAGE_KEY,
  onReload,
}: ReleaseUpdateOptions): ReleaseUpdateState {
  const normalizedCurrentVersion = useMemo(
    () => normalizeReleaseVersion(currentVersion),
    [currentVersion]
  );
  const normalizedMode = normalizeReleaseUpdateMode(mode);
  const runtime = useMemo(
    () =>
      resolveReleaseUpdateRuntime({
        origin: appOrigin,
        manifestUrl,
        workerUrl,
      }),
    [appOrigin, manifestUrl, workerUrl]
  );
  const enabled = isReleaseUpdateEnabled(normalizedMode, runtime.hostname);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const registrationPromiseRef = useRef<Promise<ServiceWorkerRegistration | null> | null>(null);
  const hasServiceWorkerSupport =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator;

  const ensureServiceWorkerRegistration = useCallback(async () => {
    if (!hasServiceWorkerSupport) {
      return null;
    }

    if (registrationRef.current) {
      return registrationRef.current;
    }

    if (registrationPromiseRef.current) {
      return registrationPromiseRef.current;
    }

    registrationPromiseRef.current = navigator.serviceWorker
      .register(runtime.workerUrl, { scope: '/' })
      .then((registration) => {
        registrationRef.current = registration;
        return registration;
      })
      .catch(() => null)
      .finally(() => {
        registrationPromiseRef.current = null;
      });

    try {
      return await registrationPromiseRef.current;
    } catch {
      registrationPromiseRef.current = null;
      return null;
    }
  }, [hasServiceWorkerSupport, runtime.workerUrl]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      if (hasServiceWorkerSupport) {
        const registration = await ensureServiceWorkerRegistration();
        if (registration) {
          if (registration.active) {
            registration.active.postMessage({
              type: RELEASE_CHECK_MESSAGE_TYPE,
              manifestUrl: runtime.manifestUrl,
            });
          } else if (registration.installing) {
            // SW is still installing; wait for it to activate before sending the message
            const onStateChange = () => {
              if (registration.active) {
                registration.active.postMessage({
                  type: RELEASE_CHECK_MESSAGE_TYPE,
                  manifestUrl: runtime.manifestUrl,
                });
                registration.installing?.removeEventListener('statechange', onStateChange);
              }
            };
            registration.installing.addEventListener('statechange', onStateChange);
          }
        }
      }

      const response = await fetch(runtime.manifestUrl, {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        setError(`Release manifest request failed with HTTP ${response.status}.`);
        setLastCheckedAt(Date.now());
        return;
      }

      const manifest = parseReleaseManifest(await response.json());
      const nextVersion = manifest?.version ?? null;
      const dismissedVersion = readStoredDismissedVersion(storageKey);
      const isUpdateAvailable =
        nextVersion !== null &&
        nextVersion !== dismissedVersion &&
        compareReleaseVersions(nextVersion, normalizedCurrentVersion) > 0;

      setRemoteVersion(nextVersion);
      setAvailable(isUpdateAvailable);
      setLastCheckedAt(Date.now());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
      setLastCheckedAt(Date.now());
    } finally {
      setChecking(false);
    }
  }, [
    enabled,
    ensureServiceWorkerRegistration,
    hasServiceWorkerSupport,
    normalizedCurrentVersion,
    runtime.manifestUrl,
    storageKey,
  ]);

  useEffect(() => {
    if (!enabled || !hasServiceWorkerSupport) {
      return;
    }

    let cancelled = false;

    const handleWorkerMessage = (event: MessageEvent<unknown>) => {
      const payload = event.data as { type?: unknown; nextVersion?: unknown } | null;
      if (!payload || payload.type !== RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE) {
        return;
      }

      const nextVersion = typeof payload.nextVersion === 'string' ? payload.nextVersion.trim() : '';
      if (!nextVersion || nextVersion === normalizedCurrentVersion) {
        return;
      }

      const dismissedVersion = readStoredDismissedVersion(storageKey);
      if (nextVersion === dismissedVersion) {
        return;
      }

      setRemoteVersion(nextVersion);
      setAvailable(true);
      setLastCheckedAt(Date.now());
    };

    void ensureServiceWorkerRegistration().then((registration) => {
      if (cancelled || !registration) {
        return;
      }
      registrationRef.current = registration;
    });

    const handleControllerChange = () => {
      if (!cancelled) {
        void refresh();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleWorkerMessage);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [
    enabled,
    ensureServiceWorkerRegistration,
    hasServiceWorkerSupport,
    normalizedCurrentVersion,
    storageKey,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refresh();

    if (pollIntervalMs <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const handleWindowFocus = () => {
      void refresh();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      clearInterval(intervalId);

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, [enabled, pollIntervalMs, refresh]);

  const dismiss = useCallback(() => {
    if (!remoteVersion) {
      setAvailable(false);
      return;
    }

    writeStoredDismissedVersion(storageKey, remoteVersion);
    setAvailable(false);
  }, [remoteVersion, storageKey]);

  const reload = useCallback(() => {
    const registration = registrationRef.current;
    if (registration?.waiting) {
      registration.waiting.postMessage({
        type: RELEASE_SKIP_WAITING_MESSAGE_TYPE,
      });
    }

    if (onReload) {
      onReload();
      return;
    }

    if (typeof window !== 'undefined' && typeof window.location.reload === 'function') {
      window.location.reload();
      return;
    }

    if (typeof globalThis !== 'undefined') {
      const globalLocation = (
        globalThis as typeof globalThis & {
          location?: { reload?: () => void };
        }
      ).location;

      if (typeof globalLocation?.reload === 'function') {
        globalLocation.reload();
      }
    }
  }, [onReload]);

  return {
    enabled,
    checking,
    available,
    currentVersion: normalizedCurrentVersion,
    remoteVersion,
    error,
    lastCheckedAt,
    refresh,
    dismiss,
    reload,
  };
}
