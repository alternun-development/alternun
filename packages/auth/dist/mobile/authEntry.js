const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DEFAULT_AUTHENTIK_LOGIN_ENTRY_MODE = 'relay';
const DEFAULT_AUTHENTIK_SOCIAL_LOGIN_MODE = 'authentik';
function normalizeHostname(value) {
    return (value !== null && value !== void 0 ? value : '').trim().toLowerCase();
}
export function parseAuthentikProviderFlowSlugs(value) {
    if (!value) {
        return {};
    }
    try {
        const parsed = JSON.parse(value);
        const slugs = {};
        if (typeof parsed.google === 'string' && parsed.google.trim().length > 0) {
            slugs.google = parsed.google.trim();
        }
        if (typeof parsed.discord === 'string' && parsed.discord.trim().length > 0) {
            slugs.discord = parsed.discord.trim();
        }
        return slugs;
    }
    catch {
        return {};
    }
}
export function resolveAuthentikProviderFlowSlugs(options) {
    var _a, _b, _c, _d;
    const hostname = (_a = options === null || options === void 0 ? void 0 : options.hostname) !== null && _a !== void 0 ? _a : (typeof window !== 'undefined' ? (_c = (_b = window.location) === null || _b === void 0 ? void 0 : _b.hostname) !== null && _c !== void 0 ? _c : null : null);
    if (LOOPBACK_HOSTNAMES.has(normalizeHostname(hostname))) {
        return {};
    }
    return parseAuthentikProviderFlowSlugs((_d = options === null || options === void 0 ? void 0 : options.value) !== null && _d !== void 0 ? _d : process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS);
}
export function normalizeAuthentikLoginEntryMode(value) {
    const normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    if (normalized === 'relay' || normalized === 'source') {
        return normalized;
    }
    return DEFAULT_AUTHENTIK_LOGIN_ENTRY_MODE;
}
export function normalizeAuthentikSocialLoginMode(value) {
    const normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    if (normalized === 'authentik' || normalized === 'hybrid' || normalized === 'supabase') {
        return normalized;
    }
    return DEFAULT_AUTHENTIK_SOCIAL_LOGIN_MODE;
}
export function getAuthentikLoginEntryMode() {
    return normalizeAuthentikLoginEntryMode(process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE);
}
export function getAuthentikSocialLoginMode() {
    return normalizeAuthentikSocialLoginMode(process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE);
}
export function shouldUseAuthentikRelayEntry() {
    return getAuthentikLoginEntryMode() === 'relay';
}
export function resolveAuthentikLoginStrategy(options) {
    var _a, _b, _c;
    return {
        mode: normalizeAuthentikLoginEntryMode((_a = options === null || options === void 0 ? void 0 : options.entryMode) !== null && _a !== void 0 ? _a : process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE),
        socialMode: normalizeAuthentikSocialLoginMode((_b = options === null || options === void 0 ? void 0 : options.socialMode) !== null && _b !== void 0 ? _b : process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE),
        providerFlowSlugs: resolveAuthentikProviderFlowSlugs({
            hostname: options === null || options === void 0 ? void 0 : options.hostname,
            value: (_c = options === null || options === void 0 ? void 0 : options.providerFlowSlugsValue) !== null && _c !== void 0 ? _c : process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS,
        }),
    };
}
export function buildAuthentikRelayPath(providerHint, options) {
    const route = buildAuthentikRelayRoute(providerHint, options);
    const params = new URLSearchParams();
    params.set('provider', route.params.provider);
    if (route.params.next) {
        params.set('next', route.params.next);
    }
    params.set('fresh', route.params.fresh);
    const query = params.toString();
    return `/auth-relay${query ? `?${query}` : ''}`;
}
export function buildAuthentikRelayRoute(providerHint, options) {
    var _a;
    const route = {
        pathname: '/auth-relay',
        params: {
            provider: providerHint,
            fresh: (options === null || options === void 0 ? void 0 : options.forceFreshSession) === false ? '0' : '1',
        },
    };
    const trimmedNext = (_a = options === null || options === void 0 ? void 0 : options.next) === null || _a === void 0 ? void 0 : _a.trim();
    if (trimmedNext) {
        route.params.next = trimmedNext;
    }
    return route;
}
