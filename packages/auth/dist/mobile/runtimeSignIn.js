import { resolveSafeRedirect } from '@edcalderon/auth/authentik';
import { isAuthentikConfigured, startAuthentikOAuthFlow } from './authentikClient';
import { resolveAuthentikLoginStrategy } from './authEntry';
import { buildAuthentikWebCallbackUrl } from './authentikUrls';
const AUTH_RETURN_TO_STORAGE_KEY = 'alternun:auth:return-to';
function canUseBrowserRuntime() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}
export function resolveAuthRuntime() {
    return canUseBrowserRuntime() ? 'web' : 'native';
}
function normalizeInternalHref(target) {
    if (target.startsWith('/') && !target.startsWith('//')) {
        return target;
    }
    try {
        const url = new URL(target);
        return `${url.pathname}${url.search}${url.hash}` || '/';
    }
    catch {
        return '/';
    }
}
export function resolveAuthReturnTo(target) {
    const allowedOrigins = canUseBrowserRuntime() ? [window.location.origin] : [];
    const safe = resolveSafeRedirect(target !== null && target !== void 0 ? target : '/', { allowedOrigins, fallbackUrl: '/' });
    return normalizeInternalHref(safe);
}
export function storeAuthReturnTo(target) {
    const resolvedTarget = resolveAuthReturnTo(target);
    if (canUseBrowserRuntime()) {
        window.sessionStorage.setItem(AUTH_RETURN_TO_STORAGE_KEY, resolvedTarget);
    }
    return resolvedTarget;
}
export function readAuthReturnTo() {
    var _a;
    if (!canUseBrowserRuntime()) {
        return null;
    }
    const stored = window.sessionStorage.getItem(AUTH_RETURN_TO_STORAGE_KEY);
    return (_a = stored === null || stored === void 0 ? void 0 : stored.trim()) !== null && _a !== void 0 ? _a : null;
}
export function clearAuthReturnTo() {
    if (!canUseBrowserRuntime()) {
        return;
    }
    window.sessionStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY);
}
export function getAuthentikWebCallbackUrl() {
    if (!canUseBrowserRuntime()) {
        throw new Error('CONFIG_ERROR: Browser callback URL requires a web runtime');
    }
    const callbackUrl = buildAuthentikWebCallbackUrl(window.location.origin);
    if (!callbackUrl) {
        throw new Error('CONFIG_ERROR: Unable to derive the web callback URL');
    }
    return callbackUrl;
}
function shouldUseAuthentikWebFlow(strategy, authentikReady, authentikProviderHint) {
    if (!authentikProviderHint) {
        return false;
    }
    if (strategy.socialMode === 'supabase') {
        return false;
    }
    if (strategy.socialMode === 'authentik') {
        return true;
    }
    return authentikReady;
}
export async function webRedirectSignIn({ client, provider, redirectTo, authentikProviderHint, forceFreshSession = false, strategy = resolveAuthentikLoginStrategy(), }) {
    if (!canUseBrowserRuntime()) {
        throw new Error('CONFIG_ERROR: webRedirectSignIn requires a browser runtime');
    }
    const callbackUrl = getAuthentikWebCallbackUrl();
    const authentikReady = isAuthentikConfigured({
        redirectUri: callbackUrl,
    });
    storeAuthReturnTo(redirectTo);
    if (shouldUseAuthentikWebFlow(strategy, authentikReady, authentikProviderHint)) {
        if (!authentikReady || !authentikProviderHint) {
            throw new Error('CONFIG_ERROR: Missing Authentik issuer, clientId, or redirectUri');
        }
        await startAuthentikOAuthFlow(authentikProviderHint, {
            redirectUri: callbackUrl,
            providerFlowSlugs: strategy.providerFlowSlugs,
            forceFreshSession,
        });
        return 'authentik';
    }
    await client.signIn({
        provider,
        flow: 'redirect',
        redirectUri: callbackUrl,
    });
    return 'supabase';
}
export async function nativeSignIn({ client, provider, redirectUri, }) {
    var _a;
    await client.signIn({
        provider,
        flow: 'native',
        redirectUri: (_a = redirectUri === null || redirectUri === void 0 ? void 0 : redirectUri.trim()) !== null && _a !== void 0 ? _a : undefined,
    });
}
