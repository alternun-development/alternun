/**
 * Alternun Authentik preset factory.
 *
 * Wraps @edcalderon/auth/authentik preset helpers with Alternun-specific
 * defaults. Derives OIDC endpoint URLs from the issuer so callers never
 * need to hardcode paths, and wires the Supabase provisioning adapter
 * (upsert_oidc_user RPC) into the preset automatically.
 *
 * Usage:
 *   const auth = createAlternunAuthentikPreset({
 *     issuer:      process.env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '',
 *     clientId:    process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? '',
 *     redirectUri: process.env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI ?? '',
 *   });
 *
 *   // Validate config on startup
 *   const { valid, checks } = auth.preset.validateConfig();
 *
 *   // Use in handleAuthentikCallback onSessionReady:
 *   handleAuthentikCallback(search, {
 *     onSessionReady: async (_, __, session) => {
 *       supabaseId = await auth.onSessionReady(session.claims, session.provider);
 *     },
 *   });
 *
 *   // On sign-out (web only):
 *   const { endSessionUrl } = await auth.logoutHandler({ accessToken, idToken });
 *   window.location.assign(endSessionUrl);
 */
import { createAuthentikPreset, createAuthentikRelayHandler, createAuthentikLogoutHandler, createProvisioningAdapter, } from '../authentik';
import { upsertOidcUser } from '../AuthentikOidcClient';
/**
 * Strip the per-app slug from an Authentik issuer URL to get the shared
 * endpoint base that Authentik places token/userinfo/authorize under.
 *
 * "https://sso.alternun.co/application/o/alternun-mobile/"
 *   → "https://sso.alternun.co/application/o/"
 */
function getEndpointBase(issuer) {
    const match = issuer.match(/^(https?:\/\/.+?\/application\/o\/)/);
    if (match)
        return match[1];
    // Fallback: strip the trailing slug segment
    return issuer.replace(/\/$/, '').replace(/\/[^/]+$/, '/');
}
export function createAlternunAuthentikPreset(options) {
    var _a;
    const { issuer, clientId, redirectUri } = options;
    const postLogoutRedirectUri = (_a = options.postLogoutRedirectUri) !== null && _a !== void 0 ? _a : redirectUri;
    const base = getEndpointBase(issuer);
    const relayConfig = {
        issuer,
        clientId,
        redirectUri,
        authorizePath: `${base}authorize/`,
    };
    const callbackConfig = {
        issuer,
        clientId,
        redirectUri,
        tokenEndpoint: `${base}token/`,
        userinfoEndpoint: `${base}userinfo/`,
    };
    const logoutConfig = {
        issuer,
        postLogoutRedirectUri,
        endSessionEndpoint: `${issuer.replace(/\/$/, '')}/end-session/`,
        revocationEndpoint: `${base}revoke/`,
        clientId,
    };
    const provisioningAdapter = createProvisioningAdapter(async (payload) => {
        var _a, _b, _c;
        try {
            const appUserId = await upsertOidcUser({
                sub: payload.sub,
                iss: payload.iss,
                email: payload.email,
                email_verified: payload.emailVerified,
                name: (_a = payload.name) !== null && _a !== void 0 ? _a : undefined,
                picture: (_b = payload.picture) !== null && _b !== void 0 ? _b : undefined,
                ...((_c = payload.rawClaims) !== null && _c !== void 0 ? _c : {}),
            }, payload.provider);
            return { synced: true, appUserId };
        }
        catch (err) {
            return {
                synced: false,
                error: err instanceof Error ? err.message : 'Provisioning failed',
            };
        }
    });
    const preset = createAuthentikPreset({
        relay: relayConfig,
        callback: callbackConfig,
        logout: logoutConfig,
        provisioningAdapter,
    });
    async function onSessionReady(claims, provider) {
        var _a, _b;
        const result = await provisioningAdapter.sync({
            sub: claims.sub,
            iss: claims.iss,
            email: (_a = claims.email) !== null && _a !== void 0 ? _a : '',
            emailVerified: claims.email_verified,
            name: claims.name,
            picture: claims.picture,
            provider,
            rawClaims: claims,
        });
        if (!result.synced) {
            throw new Error((_b = result.error) !== null && _b !== void 0 ? _b : 'Provisioning failed');
        }
        return result.appUserId;
    }
    return {
        preset,
        relayHandler: createAuthentikRelayHandler(relayConfig),
        logoutHandler: createAuthentikLogoutHandler(logoutConfig),
        onSessionReady,
    };
}
