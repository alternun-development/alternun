import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RELEASE_CHECK_MESSAGE_TYPE,
  RELEASE_MANIFEST_FILENAME,
  RELEASE_SKIP_WAITING_MESSAGE_TYPE,
  RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE,
  renderReleaseWorkerSource,
} from './service-worker';
import {
  normalizeReleaseVersion,
  parseReleaseManifest,
  serializeReleaseManifest,
  type ReleaseManifest,
} from './manifest';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DEFAULT_STORAGE_KEY = 'alternun.release.dismissed-version';
const DEFAULT_MANIFEST_URL = `/${RELEASE_MANIFEST_FILENAME}`;
const DEFAULT_WORKER_URL = '/alternun-release-worker.js';
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;

export type ReleaseUpdateMode = 'auto' | 'on' | 'off';

export interface ReleaseUpdateOptions {
  currentVersion: string;
  mode?: string | null;
  manifestUrl?: string;
  workerUrl?: string;
  pollIntervalMs?: number;
  storageKey?: string;
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

function readStoredDismissedVersion(storageKey: string): string | null {
  if (typeof window === 'undefined') {
    return null;
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
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  storageKey = DEFAULT_STORAGE_KEY,
}: ReleaseUpdateOptions): ReleaseUpdateState {
  const normalizedCurrentVersion = useMemo(
    () => normalizeReleaseVersion(currentVersion),
    [currentVersion]
  );
  const normalizedMode = normalizeReleaseUpdateMode(mode);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : null;
  const enabled = isReleaseUpdateEnabled(normalizedMode, hostname);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      if ('serviceWorker' in navigator) {
        const registration =
          registrationRef.current ??
          (await navigator.serviceWorker.register(workerUrl, { scope: '/' }).catch(() => null));
        if (registration) {
          registrationRef.current = registration;
          registration.active?.postMessage({
            type: RELEASE_CHECK_MESSAGE_TYPE,
            manifestUrl,
          });
        }
      }

      const response = await fetch(manifestUrl, {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        setAvailable(false);
        setLastCheckedAt(Date.now());
        return;
      }

      const manifest = parseReleaseManifest(await response.json());
      const nextVersion = manifest?.version ?? null;
      const dismissedVersion = readStoredDismissedVersion(storageKey);
      const isUpdateAvailable =
        Boolean(nextVersion) &&
        nextVersion !== normalizedCurrentVersion &&
        nextVersion !== dismissedVersion;

      setRemoteVersion(nextVersion);
      setAvailable(isUpdateAvailable);
      setLastCheckedAt(Date.now());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
      setLastCheckedAt(Date.now());
    } finally {
      setChecking(false);
    }
  }, [enabled, manifestUrl, normalizedCurrentVersion, storageKey, workerUrl]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
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

    void navigator.serviceWorker
      .register(workerUrl, { scope: '/' })
      .then((registration) => {
        if (cancelled) {
          return;
        }
        registrationRef.current = registration;
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener('message', handleWorkerMessage);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
    };
  }, [enabled, normalizedCurrentVersion, storageKey, workerUrl]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    void refresh();

    if (pollIntervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const handleWindowFocus = () => {
      void refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
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
    if (typeof window === 'undefined') {
      return;
    }

    const registration = registrationRef.current;
    if (registration?.waiting) {
      registration.waiting.postMessage({
        type: RELEASE_SKIP_WAITING_MESSAGE_TYPE,
      });
    }

    window.location.reload();
  }, []);

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
