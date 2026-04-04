import { OIDC_INITIAL_SEARCH, clearOidcSession as rawClearOidcSession, handleAuthentikCallback as rawHandleAuthentikCallback, hasPendingAuthentikCallback as rawHasPendingAuthentikCallback, isAuthentikConfigured as rawIsAuthentikConfigured, readOidcSession as rawReadOidcSession, } from '@edcalderon/auth';
import { buildAuthentikOAuthFlowStartUrl as buildOauthStartUrl, } from './authentikUrls';
const DEFAULT_ENV_KEYS = {
    issuer: 'EXPO_PUBLIC_AUTHENTIK_ISSUER',
    clientId: 'EXPO_PUBLIC_AUTHENTIK_CLIENT_ID',
    redirectUri: 'EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI',
};
const DEFAULT_PENDING_STORAGE_KEY = 'authentik:oidc:pending';
const DEFAULT_PENDING_PROVIDER_KEY = 'alternun:oidc:pending_provider';
function getProcessEnv() {
    var _a;
    const maybeProcess = globalThis.process;
    return (_a = maybeProcess === null || maybeProcess === void 0 ? void 0 : maybeProcess.env) !== null && _a !== void 0 ? _a : {};
}
function resolveEnvValue(config, key) {
    var _a, _b, _c, _d;
    const envKeys = { ...DEFAULT_ENV_KEYS, ...((_a = config.envKeys) !== null && _a !== void 0 ? _a : {}), };
    const explicit = key === 'issuer' ? config.issuer : key === 'clientId' ? config.clientId : config.redirectUri;
    if (explicit === null || explicit === void 0 ? void 0 : explicit.trim()) {
        return explicit.trim();
    }
    const envSource = (_b = config.env) !== null && _b !== void 0 ? _b : getProcessEnv();
    const envKey = (_c = envKeys[key]) !== null && _c !== void 0 ? _c : DEFAULT_ENV_KEYS[key];
    return (_d = envSource[envKey]) === null || _d === void 0 ? void 0 : _d.trim();
}
function resolveSessionStorage(config) {
    if (config.sessionStorage) {
        return config.sessionStorage;
    }
    if (!(window === null || window === void 0 ? void 0 : window.sessionStorage)) {
        throw new Error('CONFIG_ERROR: sessionStorage is unavailable in this runtime');
    }
    return window.sessionStorage;
}
function resolveAuthentikClientConfig(config = {}) {
    var _a, _b, _c;
    const issuer = resolveEnvValue(config, 'issuer');
    const clientId = resolveEnvValue(config, 'clientId');
    const redirectUri = resolveEnvValue(config, 'redirectUri');
    const normalizedScope = (_a = config.scope) === null || _a === void 0 ? void 0 : _a.trim();
    if (!issuer || !clientId || !redirectUri) {
        throw new Error('CONFIG_ERROR: Missing Authentik issuer, clientId, or redirectUri');
    }
    return {
        issuer,
        clientId,
        redirectUri,
        scope: normalizedScope && normalizedScope.length > 0 ? normalizedScope : 'openid profile email',
        pendingStorageKey: (_b = config.pendingStorageKey) !== null && _b !== void 0 ? _b : DEFAULT_PENDING_STORAGE_KEY,
        pendingProviderKey: config.pendingStorageKey
            ? `${config.pendingStorageKey}:provider`
            : DEFAULT_PENDING_PROVIDER_KEY,
        providerSourceSlugs: (_c = config.providerSourceSlugs) !== null && _c !== void 0 ? _c : {},
        sessionStorage: resolveSessionStorage(config),
    };
}
function encodeBase64Url(bytes) {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function randomString(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return encodeBase64Url(bytes);
}
async function sha256(input) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return new Uint8Array(digest);
}
async function buildPkcePair() {
    const verifier = randomString(64);
    const challenge = encodeBase64Url(await sha256(verifier));
    return { verifier, challenge, };
}
function buildAuthentikLogoutUrl({ issuer, clientId, postLogoutRedirectUri, idTokenHint, }) {
    const endSessionUrl = new URL(`${issuer.replace(/\/$/, '')}/end-session/`);
    endSessionUrl.searchParams.set('client_id', clientId);
    endSessionUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
    if (idTokenHint) {
        endSessionUrl.searchParams.set('id_token_hint', idTokenHint);
    }
    return endSessionUrl.toString();
}
export function buildAlternunAuthentikOAuthFlowStartUrl(input) {
    return buildOauthStartUrl(input);
}
export { buildOauthStartUrl as buildAuthentikOAuthFlowStartUrl, };
export function readPendingAuthentikOAuthProvider(config = {}) {
    var _a, _b;
    const key = config.pendingStorageKey
        ? `${config.pendingStorageKey}:provider`
        : DEFAULT_PENDING_PROVIDER_KEY;
    const storage = (_a = config.sessionStorage) !== null && _a !== void 0 ? _a : (typeof window !== 'undefined' ? window.sessionStorage : null);
    const value = (_b = storage === null || storage === void 0 ? void 0 : storage.getItem(key)) !== null && _b !== void 0 ? _b : null;
    if (value === 'google' || value === 'discord') {
        return value;
    }
    return null;
}
export function clearPendingAuthentikOAuthProvider(config = {}) {
    var _a;
    const key = config.pendingStorageKey
        ? `${config.pendingStorageKey}:provider`
        : DEFAULT_PENDING_PROVIDER_KEY;
    const storage = (_a = config.sessionStorage) !== null && _a !== void 0 ? _a : (typeof window !== 'undefined' ? window.sessionStorage : null);
    storage === null || storage === void 0 ? void 0 : storage.removeItem(key);
}
function setPendingAuthentikOAuthProvider(provider, resolved) {
    resolved.sessionStorage.setItem(resolved.pendingProviderKey, provider);
}
export function isAuthentikConfigured(config = {}) {
    return rawIsAuthentikConfigured(config);
}
export function hasPendingAuthentikCallback(searchString) {
    return rawHasPendingAuthentikCallback(searchString);
}
export function readOidcSession(config = {}) {
    return rawReadOidcSession(config);
}
export function clearOidcSession(config = {}) {
    clearPendingAuthentikOAuthProvider(config);
    rawClearOidcSession(config);
}
export async function startAuthentikOAuthFlow(provider, config = {}) {
    if (typeof window === 'undefined') {
        throw new Error('CONFIG_ERROR: startAuthentikOAuthFlow requires a browser runtime');
    }
    const resolved = resolveAuthentikClientConfig(config);
    if (config.forceFreshSession) {
        setPendingAuthentikOAuthProvider(provider, resolved);
        const currentSession = rawReadOidcSession(config);
        window.location.assign(buildAuthentikLogoutUrl({
            issuer: resolved.issuer,
            clientId: resolved.clientId,
            postLogoutRedirectUri: `${window.location.origin}/`,
            idTokenHint: currentSession === null || currentSession === void 0 ? void 0 : currentSession.tokens.idToken,
        }));
        return;
    }
    clearPendingAuthentikOAuthProvider(config);
    const { verifier, challenge, } = await buildPkcePair();
    const state = randomString(32);
    const pendingState = {
        state,
        provider,
        codeVerifier: verifier,
        createdAt: Date.now(),
    };
    resolved.sessionStorage.setItem(resolved.pendingStorageKey, JSON.stringify(pendingState));
    resolved.sessionStorage.setItem(OIDC_INITIAL_SEARCH, window.location.search || '');
    window.location.assign(buildOauthStartUrl({
        providerHint: provider,
        issuer: resolved.issuer,
        clientId: resolved.clientId,
        redirectUri: resolved.redirectUri,
        state,
        codeChallenge: challenge,
        scope: resolved.scope,
        providerFlowSlugs: config.providerFlowSlugs,
        providerSourceSlugs: resolved.providerSourceSlugs,
    }));
}
export async function handleAuthentikCallback(searchString, config = {}) {
    const session = await rawHandleAuthentikCallback(searchString, config);
    clearPendingAuthentikOAuthProvider(config);
    return session;
}
export { OIDC_INITIAL_SEARCH, };
