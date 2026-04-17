/**
 * Alternun Authentik preset factory.
 *
 * Wraps @edcalderon/auth/authentik preset helpers with Alternun-specific
 * defaults. Derives OIDC endpoint URLs from the issuer so callers never
 * need to hardcode paths. Callers may supply their own provisioning
 * adapter; when they do not, the legacy Supabase compatibility adapter
 * remains available as a fallback.
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
import { type AuthentikPreset, type AuthentikRelayHandler, type AuthentikLogoutResult, type ProvisioningAdapter } from '../authentik';
import type { OidcClaims } from '@edcalderon/auth';
export interface AlternunAuthentikPresetOptions {
    issuer: string;
    clientId: string;
    redirectUri: string;
    /** URL to land on after Authentik clears its session. Defaults to redirectUri. */
    postLogoutRedirectUri?: string;
    /**
     * Optional provisioning adapter for identity sync.
     * Supplying this makes the Supabase compatibility seam explicit at the app edge.
     */
    provisioningAdapter?: ProvisioningAdapter;
}
export interface AlternunAuthentikPreset {
    /** The raw @edcalderon/auth preset — call preset.validateConfig() at startup. */
    preset: AuthentikPreset;
    /** Pre-built relay handler for cross-origin login flows (SSR/server routes). */
    relayHandler: AuthentikRelayHandler;
    /**
     * Pre-built logout handler.
     * Revokes the access token (best-effort) and returns the RP-initiated
     * end-session URL. Caller is responsible for navigating to that URL.
     */
    logoutHandler: (tokens: {
        accessToken?: string;
        idToken?: string;
    }) => Promise<AuthentikLogoutResult>;
    /**
     * Provisioning bridge used by onSessionReady.
     * When callers pass an explicit adapter, the app edge owns the Supabase
     * compatibility seam. If omitted, the preset falls back to the legacy
     * upsert_oidc_user compatibility path.
     */
    onSessionReady: (claims: OidcClaims, provider: string | undefined) => Promise<string | undefined>;
}
export declare function createAlternunAuthentikPreset(options: AlternunAuthentikPresetOptions): AlternunAuthentikPreset;
