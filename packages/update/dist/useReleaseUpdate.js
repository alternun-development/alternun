"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeReleaseUpdateMode = normalizeReleaseUpdateMode;
exports.isReleaseUpdateEnabled = isReleaseUpdateEnabled;
exports.buildReleaseManifestJson = buildReleaseManifestJson;
exports.buildReleaseWorkerSource = buildReleaseWorkerSource;
exports.useReleaseUpdate = useReleaseUpdate;
const react_1 = require("react");
const service_worker_1 = require("./service-worker");
const manifest_1 = require("./manifest");
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DEFAULT_STORAGE_KEY = 'alternun.release.dismissed-version';
const DEFAULT_MANIFEST_URL = `/${service_worker_1.RELEASE_MANIFEST_FILENAME}`;
const DEFAULT_WORKER_URL = '/alternun-release-worker.js';
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;
function normalizeReleaseUpdateMode(value) {
    const normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    if (normalized === 'on' || normalized === 'off' || normalized === 'auto') {
        return normalized;
    }
    return 'auto';
}
function isReleaseUpdateEnabled(mode, hostname) {
    if (mode === 'on') {
        return true;
    }
    if (mode === 'off') {
        return false;
    }
    const normalizedHostname = (hostname !== null && hostname !== void 0 ? hostname : '').trim().toLowerCase();
    return !LOOPBACK_HOSTNAMES.has(normalizedHostname);
}
function readStoredDismissedVersion(storageKey) {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const value = window.localStorage.getItem(storageKey);
        return (value === null || value === void 0 ? void 0 : value.trim()) ? value.trim() : null;
    }
    catch {
        return null;
    }
}
function writeStoredDismissedVersion(storageKey, version) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(storageKey, version);
    }
    catch {
        // Intentionally ignore storage failures.
    }
}
function createUpdateManifest(version) {
    return { version: (0, manifest_1.normalizeReleaseVersion)(version) };
}
function buildReleaseManifestJson(version) {
    return (0, manifest_1.serializeReleaseManifest)(createUpdateManifest(version));
}
function buildReleaseWorkerSource(currentVersion, manifestUrl = DEFAULT_MANIFEST_URL) {
    return (0, service_worker_1.renderReleaseWorkerSource)({
        currentVersion,
        manifestUrl,
    });
}
function useReleaseUpdate({ currentVersion, mode, manifestUrl = DEFAULT_MANIFEST_URL, workerUrl = DEFAULT_WORKER_URL, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, storageKey = DEFAULT_STORAGE_KEY, }) {
    const normalizedCurrentVersion = (0, react_1.useMemo)(() => (0, manifest_1.normalizeReleaseVersion)(currentVersion), [currentVersion]);
    const normalizedMode = normalizeReleaseUpdateMode(mode);
    const hostname = typeof window !== 'undefined' ? window.location.hostname : null;
    const enabled = isReleaseUpdateEnabled(normalizedMode, hostname);
    const [checking, setChecking] = (0, react_1.useState)(false);
    const [available, setAvailable] = (0, react_1.useState)(false);
    const [remoteVersion, setRemoteVersion] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [lastCheckedAt, setLastCheckedAt] = (0, react_1.useState)(null);
    const registrationRef = (0, react_1.useRef)(null);
    const refresh = (0, react_1.useCallback)(async () => {
        var _a, _b, _c;
        if (!enabled || typeof window === 'undefined') {
            return;
        }
        setChecking(true);
        setError(null);
        try {
            if ('serviceWorker' in navigator) {
                const registration = (_a = registrationRef.current) !== null && _a !== void 0 ? _a : (await navigator.serviceWorker.register(workerUrl, { scope: '/' }).catch(() => null));
                if (registration) {
                    registrationRef.current = registration;
                    (_b = registration.active) === null || _b === void 0 ? void 0 : _b.postMessage({
                        type: service_worker_1.RELEASE_CHECK_MESSAGE_TYPE,
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
            const manifest = (0, manifest_1.parseReleaseManifest)(await response.json());
            const nextVersion = (_c = manifest === null || manifest === void 0 ? void 0 : manifest.version) !== null && _c !== void 0 ? _c : null;
            const dismissedVersion = readStoredDismissedVersion(storageKey);
            const isUpdateAvailable = Boolean(nextVersion) &&
                nextVersion !== normalizedCurrentVersion &&
                nextVersion !== dismissedVersion;
            setRemoteVersion(nextVersion);
            setAvailable(isUpdateAvailable);
            setLastCheckedAt(Date.now());
        }
        catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
            setLastCheckedAt(Date.now());
        }
        finally {
            setChecking(false);
        }
    }, [enabled, manifestUrl, normalizedCurrentVersion, storageKey, workerUrl]);
    (0, react_1.useEffect)(() => {
        if (!enabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }
        let cancelled = false;
        const handleWorkerMessage = (event) => {
            const payload = event.data;
            if (!payload || payload.type !== service_worker_1.RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE) {
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
    (0, react_1.useEffect)(() => {
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
    const dismiss = (0, react_1.useCallback)(() => {
        if (!remoteVersion) {
            setAvailable(false);
            return;
        }
        writeStoredDismissedVersion(storageKey, remoteVersion);
        setAvailable(false);
    }, [remoteVersion, storageKey]);
    const reload = (0, react_1.useCallback)(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const registration = registrationRef.current;
        if (registration === null || registration === void 0 ? void 0 : registration.waiting) {
            registration.waiting.postMessage({
                type: service_worker_1.RELEASE_SKIP_WAITING_MESSAGE_TYPE,
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
