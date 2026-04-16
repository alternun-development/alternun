"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeReleaseUpdateMode = normalizeReleaseUpdateMode;
exports.isReleaseUpdateEnabled = isReleaseUpdateEnabled;
exports.resolveReleaseUpdateRuntime = resolveReleaseUpdateRuntime;
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
const dismissedVersionsInMemory = new Map();
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
function trimReleaseValue(value) {
    const trimmed = value === null || value === void 0 ? void 0 : value.trim();
    return trimmed ? trimmed : null;
}
function resolveRuntimeOrigin(explicitOrigin) {
    var _a;
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
    return ((_a = trimReleaseValue(process.env.EXPO_PUBLIC_ORIGIN)) !== null && _a !== void 0 ? _a : trimReleaseValue(process.env.NEXT_PUBLIC_ORIGIN));
}
function resolveRuntimeHostname(origin) {
    if (!origin) {
        return null;
    }
    try {
        return new URL(origin).hostname.trim().toLowerCase();
    }
    catch {
        return origin.trim().toLowerCase();
    }
}
function resolveReleaseAssetUrl(fileName, explicitUrl, origin, fallbackUrl) {
    const trimmedExplicitUrl = trimReleaseValue(explicitUrl);
    if (trimmedExplicitUrl) {
        return trimmedExplicitUrl;
    }
    if (origin) {
        try {
            return new URL(fileName, origin).toString();
        }
        catch {
            // Fall through to the local fallback path.
        }
    }
    return fallbackUrl;
}
function resolveReleaseUpdateRuntime({ origin, manifestUrl, workerUrl, } = {}) {
    const resolvedOrigin = resolveRuntimeOrigin(origin);
    return {
        origin: resolvedOrigin,
        hostname: resolveRuntimeHostname(resolvedOrigin),
        manifestUrl: resolveReleaseAssetUrl(service_worker_1.RELEASE_MANIFEST_FILENAME, manifestUrl !== null && manifestUrl !== void 0 ? manifestUrl : undefined, resolvedOrigin, DEFAULT_MANIFEST_URL),
        workerUrl: resolveReleaseAssetUrl(service_worker_1.RELEASE_WORKER_FILENAME, workerUrl !== null && workerUrl !== void 0 ? workerUrl : undefined, resolvedOrigin, DEFAULT_WORKER_URL),
    };
}
function readStoredDismissedVersion(storageKey) {
    var _a;
    if (typeof window === 'undefined') {
        return (_a = dismissedVersionsInMemory.get(storageKey)) !== null && _a !== void 0 ? _a : null;
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
        dismissedVersionsInMemory.set(storageKey, version);
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
function useReleaseUpdate({ currentVersion, mode, manifestUrl = DEFAULT_MANIFEST_URL, workerUrl = DEFAULT_WORKER_URL, appOrigin, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, storageKey = DEFAULT_STORAGE_KEY, onReload, }) {
    const normalizedCurrentVersion = (0, react_1.useMemo)(() => (0, manifest_1.normalizeReleaseVersion)(currentVersion), [currentVersion]);
    const normalizedMode = normalizeReleaseUpdateMode(mode);
    const runtime = (0, react_1.useMemo)(() => resolveReleaseUpdateRuntime({
        origin: appOrigin,
        manifestUrl,
        workerUrl,
    }), [appOrigin, manifestUrl, workerUrl]);
    const enabled = isReleaseUpdateEnabled(normalizedMode, runtime.hostname);
    const [checking, setChecking] = (0, react_1.useState)(false);
    const [available, setAvailable] = (0, react_1.useState)(false);
    const [remoteVersion, setRemoteVersion] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [lastCheckedAt, setLastCheckedAt] = (0, react_1.useState)(null);
    const registrationRef = (0, react_1.useRef)(null);
    const registrationPromiseRef = (0, react_1.useRef)(null);
    const hasServiceWorkerSupport = typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator;
    const ensureServiceWorkerRegistration = (0, react_1.useCallback)(async () => {
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
        }
        catch {
            registrationPromiseRef.current = null;
            return null;
        }
    }, [hasServiceWorkerSupport, runtime.workerUrl]);
    const refresh = (0, react_1.useCallback)(async () => {
        var _a;
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
                            type: service_worker_1.RELEASE_CHECK_MESSAGE_TYPE,
                            manifestUrl: runtime.manifestUrl,
                        });
                    }
                    else if (registration.installing) {
                        // SW is still installing; wait for it to activate before sending the message
                        const onStateChange = () => {
                            var _a;
                            if (registration.active) {
                                registration.active.postMessage({
                                    type: service_worker_1.RELEASE_CHECK_MESSAGE_TYPE,
                                    manifestUrl: runtime.manifestUrl,
                                });
                                (_a = registration.installing) === null || _a === void 0 ? void 0 : _a.removeEventListener('statechange', onStateChange);
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
            const manifest = (0, manifest_1.parseReleaseManifest)(await response.json());
            const nextVersion = (_a = manifest === null || manifest === void 0 ? void 0 : manifest.version) !== null && _a !== void 0 ? _a : null;
            const dismissedVersion = readStoredDismissedVersion(storageKey);
            const isUpdateAvailable = nextVersion !== null &&
                nextVersion !== dismissedVersion &&
                (0, manifest_1.compareReleaseVersions)(nextVersion, normalizedCurrentVersion) > 0;
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
    }, [
        enabled,
        ensureServiceWorkerRegistration,
        hasServiceWorkerSupport,
        normalizedCurrentVersion,
        runtime.manifestUrl,
        storageKey,
    ]);
    (0, react_1.useEffect)(() => {
        if (!enabled || !hasServiceWorkerSupport) {
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
    (0, react_1.useEffect)(() => {
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
    const dismiss = (0, react_1.useCallback)(() => {
        if (!remoteVersion) {
            setAvailable(false);
            return;
        }
        writeStoredDismissedVersion(storageKey, remoteVersion);
        setAvailable(false);
    }, [remoteVersion, storageKey]);
    const reload = (0, react_1.useCallback)(() => {
        const registration = registrationRef.current;
        if (registration === null || registration === void 0 ? void 0 : registration.waiting) {
            registration.waiting.postMessage({
                type: service_worker_1.RELEASE_SKIP_WAITING_MESSAGE_TYPE,
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
            const globalLocation = globalThis.location;
            if (typeof (globalLocation === null || globalLocation === void 0 ? void 0 : globalLocation.reload) === 'function') {
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
