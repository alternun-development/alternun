const DEFAULT_SCOPE = 'openid profile email';
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
function isLoopbackHostname(value) {
    const hostname = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    return Boolean(hostname && LOOPBACK_HOSTNAMES.has(hostname));
}
function shouldPreferBrowserOrigin(explicitRedirectUri, browserOrigin) {
    if (!(browserOrigin === null || browserOrigin === void 0 ? void 0 : browserOrigin.trim())) {
        return false;
    }
    try {
        const explicitUrl = new URL(explicitRedirectUri);
        return isLoopbackHostname(explicitUrl.hostname);
    }
    catch {
        return false;
    }
}
export function resolveAuthentikRedirectUri(explicitRedirectUri, browserOrigin) {
    const normalizedExplicitRedirectUri = explicitRedirectUri === null || explicitRedirectUri === void 0 ? void 0 : explicitRedirectUri.trim();
    if (normalizedExplicitRedirectUri && !shouldPreferBrowserOrigin(normalizedExplicitRedirectUri, browserOrigin)) {
        return normalizedExplicitRedirectUri;
    }
    const normalizedBrowserOrigin = browserOrigin === null || browserOrigin === void 0 ? void 0 : browserOrigin.trim();
    if (!normalizedBrowserOrigin) {
        return undefined;
    }
    return normalizedBrowserOrigin.endsWith('/')
        ? normalizedBrowserOrigin
        : `${normalizedBrowserOrigin}/`;
}
export function getAuthentikEndpointBaseFromIssuer(issuer) {
    const match = issuer.match(/^(https?:\/\/.+?\/application\/o\/)/);
    if (match) {
        return match[1];
    }
    return issuer.replace(/\/$/, '').replace(/\/[^/]+$/, '/');
}
export function buildAuthentikOAuthFlowStartUrl({ providerHint, issuer, clientId, redirectUri, state, codeChallenge, scope, providerFlowSlugs, providerSourceSlugs, }) {
    var _a;
    const normalizedScope = scope === null || scope === void 0 ? void 0 : scope.trim();
    const authorizeUrl = new URL(`${getAuthentikEndpointBaseFromIssuer(issuer)}authorize/`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', normalizedScope && normalizedScope.length > 0 ? normalizedScope : DEFAULT_SCOPE);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    const authentikOrigin = new URL(issuer).origin;
    const flowSlug = (_a = providerFlowSlugs === null || providerFlowSlugs === void 0 ? void 0 : providerFlowSlugs[providerHint]) === null || _a === void 0 ? void 0 : _a.trim();
    if (flowSlug) {
        return `${authentikOrigin}/if/flow/${encodeURIComponent(flowSlug)}/?next=${encodeURIComponent(authorizeUrl.toString())}`;
    }
    const sourceSlugCandidate = providerSourceSlugs === null || providerSourceSlugs === void 0 ? void 0 : providerSourceSlugs[providerHint];
    const sourceSlug = sourceSlugCandidate != null && sourceSlugCandidate.trim().length > 0
        ? sourceSlugCandidate.trim()
        : providerHint;
    return `${authentikOrigin}/source/oauth/login/${encodeURIComponent(sourceSlug)}/?next=${encodeURIComponent(authorizeUrl.toString())}`;
}
