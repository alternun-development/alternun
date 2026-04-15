const DEFAULT_SCOPE = 'openid profile email';
export const DEFAULT_AUTHENTIK_CLIENT_ID = 'alternun-mobile';
export const AUTHENTIK_WEB_CALLBACK_PATH = '/auth/callback';
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
function isLoopbackHostname(value) {
    const hostname = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    return Boolean(hostname && LOOPBACK_HOSTNAMES.has(hostname));
}
function shouldPreferBrowserOrigin(explicitRedirectUri, browserOrigin) {
    const normalizedBrowserOrigin = normalizeBrowserOrigin(browserOrigin);
    if (!normalizedBrowserOrigin) {
        return false;
    }
    try {
        const explicitUrl = new URL(explicitRedirectUri);
        const browserUrl = new URL(normalizedBrowserOrigin);
        // Local browser sessions should always finish on the active app origin,
        // even if an explicit redirect env still points at testnet.
        if (isLoopbackHostname(browserUrl.hostname)) {
            return true;
        }
        if (isLoopbackHostname(explicitUrl.hostname)) {
            return true;
        }
        return explicitUrl.origin === normalizedBrowserOrigin && explicitUrl.pathname === '/';
    }
    catch {
        return false;
    }
}
function deriveAuthentikIssuerFromBrowserOrigin(browserOrigin, clientId) {
    try {
        const origin = new URL(browserOrigin.trim());
        if (isLoopbackHostname(origin.hostname)) {
            return undefined;
        }
        const hostnameParts = origin.hostname.split('.');
        const airsIndex = hostnameParts.indexOf('airs');
        if (airsIndex === -1) {
            return undefined;
        }
        hostnameParts[airsIndex] = 'sso';
        return `${origin.protocol}//${hostnameParts.join('.')}/application/o/${encodeURIComponent(clientId)}/`;
    }
    catch {
        return undefined;
    }
}
function normalizeBrowserOrigin(browserOrigin) {
    const normalizedBrowserOrigin = browserOrigin === null || browserOrigin === void 0 ? void 0 : browserOrigin.trim();
    if (!normalizedBrowserOrigin) {
        return undefined;
    }
    let endIndex = normalizedBrowserOrigin.length;
    while (endIndex > 0 && normalizedBrowserOrigin.charAt(endIndex - 1) === '/') {
        endIndex -= 1;
    }
    if (endIndex === 0) {
        return undefined;
    }
    return normalizedBrowserOrigin.slice(0, endIndex);
}
export function buildAuthentikWebCallbackUrl(browserOrigin, callbackPath = AUTHENTIK_WEB_CALLBACK_PATH) {
    const normalizedOrigin = normalizeBrowserOrigin(browserOrigin);
    if (!normalizedOrigin) {
        return undefined;
    }
    const normalizedPath = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`;
    return `${normalizedOrigin}${normalizedPath}`;
}
export function resolveAuthentikClientId(explicitClientId) {
    const normalizedExplicitClientId = explicitClientId === null || explicitClientId === void 0 ? void 0 : explicitClientId.trim();
    if (normalizedExplicitClientId) {
        return normalizedExplicitClientId;
    }
    return DEFAULT_AUTHENTIK_CLIENT_ID;
}
export function resolveAuthentikIssuer(explicitIssuer, browserOrigin, clientId = DEFAULT_AUTHENTIK_CLIENT_ID) {
    const normalizedExplicitIssuer = explicitIssuer === null || explicitIssuer === void 0 ? void 0 : explicitIssuer.trim();
    if (normalizedExplicitIssuer) {
        return normalizedExplicitIssuer;
    }
    const normalizedBrowserOrigin = browserOrigin === null || browserOrigin === void 0 ? void 0 : browserOrigin.trim();
    if (!normalizedBrowserOrigin) {
        return undefined;
    }
    return deriveAuthentikIssuerFromBrowserOrigin(normalizedBrowserOrigin, clientId);
}
export function resolveAuthentikRedirectUri(explicitRedirectUri, browserOrigin) {
    const normalizedExplicitRedirectUri = explicitRedirectUri === null || explicitRedirectUri === void 0 ? void 0 : explicitRedirectUri.trim();
    if (normalizedExplicitRedirectUri &&
        !shouldPreferBrowserOrigin(normalizedExplicitRedirectUri, browserOrigin)) {
        return normalizedExplicitRedirectUri;
    }
    return buildAuthentikWebCallbackUrl(browserOrigin);
}
export function getAuthentikEndpointBaseFromIssuer(issuer) {
    const match = issuer.match(/^(https?:\/\/.+?\/application\/o\/)/);
    if (match) {
        return match[1];
    }
    return issuer.replace(/\/$/, '').replace(/\/[^/]+$/, '/');
}
export function buildAuthentikLoginEntryUrl({ issuer, authorizeUrl, providerHint, providerFlowSlugs, providerSourceSlugs, }) {
    var _a;
    const trimmedAuthorizeUrl = authorizeUrl.trim();
    const normalizedProviderHint = providerHint === null || providerHint === void 0 ? void 0 : providerHint.trim();
    if (!trimmedAuthorizeUrl) {
        throw new Error('CONFIG_ERROR: authorizeUrl is required');
    }
    if (!normalizedProviderHint) {
        return trimmedAuthorizeUrl;
    }
    const authentikOrigin = new URL(issuer).origin;
    const flowSlug = (_a = providerFlowSlugs === null || providerFlowSlugs === void 0 ? void 0 : providerFlowSlugs[normalizedProviderHint]) === null || _a === void 0 ? void 0 : _a.trim();
    if (flowSlug) {
        return `${authentikOrigin}/if/flow/${encodeURIComponent(flowSlug)}/?next=${encodeURIComponent(trimmedAuthorizeUrl)}`;
    }
    const sourceSlugCandidate = providerSourceSlugs === null || providerSourceSlugs === void 0 ? void 0 : providerSourceSlugs[normalizedProviderHint];
    const sourceSlug = sourceSlugCandidate != null && sourceSlugCandidate.trim().length > 0
        ? sourceSlugCandidate.trim()
        : normalizedProviderHint;
    return `${authentikOrigin}/source/oauth/login/${encodeURIComponent(sourceSlug)}/?next=${encodeURIComponent(trimmedAuthorizeUrl)}`;
}
export function buildAuthentikOAuthFlowStartUrl({ providerHint, issuer, clientId, redirectUri, state, codeChallenge, scope, providerFlowSlugs, providerSourceSlugs, }) {
    const normalizedScope = scope === null || scope === void 0 ? void 0 : scope.trim();
    const authorizeUrl = new URL(`${getAuthentikEndpointBaseFromIssuer(issuer)}authorize/`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', normalizedScope && normalizedScope.length > 0 ? normalizedScope : DEFAULT_SCOPE);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    return buildAuthentikLoginEntryUrl({
        issuer,
        authorizeUrl: authorizeUrl.toString(),
        providerHint,
        providerFlowSlugs,
        providerSourceSlugs,
    });
}
