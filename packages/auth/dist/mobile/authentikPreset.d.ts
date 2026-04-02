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
import {
  type AuthentikPreset,
  type AuthentikRelayHandler,
  type AuthentikLogoutResult,
} from '@edcalderon/auth/authentik';
import type { OidcClaims } from '@edcalderon/auth';
export interface AlternunAuthentikPresetOptions {
  issuer: string;
  clientId: string;
  redirectUri: string;
  /** URL to land on after Authentik clears its session. Defaults to redirectUri. */
  postLogoutRedirectUri?: string;
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
   * Provisioning bridge — syncs the OIDC identity into Supabase via the
   * upsert_oidc_user RPC. Pass as the onSessionReady callback body.
   * Returns the app-level Supabase UUID on success or throws on failure.
   */
  onSessionReady: (claims: OidcClaims, provider: string | undefined) => Promise<string | undefined>;
}
export declare function createAlternunAuthentikPreset(
  options: AlternunAuthentikPresetOptions
): AlternunAuthentikPreset;
