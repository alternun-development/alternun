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
  createAuthentikPreset,
  createAuthentikRelayHandler,
  createAuthentikLogoutHandler,
  createProvisioningAdapter,
  type AuthentikPreset,
  type AuthentikRelayHandler,
  type AuthentikLogoutResult,
  type ProvisioningAdapter,
  type ProvisioningPayload,
  type ProvisioningResult,
} from '@edcalderon/auth/authentik';
import type { OidcClaims } from '@edcalderon/auth';
import { upsertOidcUser } from '../AuthentikOidcClient';

/**
 * Strip the per-app slug from an Authentik issuer URL to get the shared
 * endpoint base that Authentik places token/userinfo/authorize under.
 *
 * "https://sso.alternun.co/application/o/alternun-mobile/"
 *   → "https://sso.alternun.co/application/o/"
 */
function getEndpointBase(issuer: string): string {
  const match = issuer.match(/^(https?:\/\/.+?\/application\/o\/)/);
  if (match) return match[1];
  // Fallback: strip the trailing slug segment
  return issuer.replace(/\/$/, '').replace(/\/[^/]+$/, '/');
}

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

export function createAlternunAuthentikPreset(
  options: AlternunAuthentikPresetOptions
): AlternunAuthentikPreset {
  const { issuer, clientId, redirectUri } = options;
  const postLogoutRedirectUri = options.postLogoutRedirectUri ?? redirectUri;
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

  const provisioningAdapter: ProvisioningAdapter = createProvisioningAdapter(
    async (payload: ProvisioningPayload): Promise<ProvisioningResult> => {
      try {
        const appUserId = await upsertOidcUser(
          {
            sub: payload.sub,
            iss: payload.iss,
            email: payload.email,
            email_verified: payload.emailVerified,
            name: payload.name ?? undefined,
            picture: payload.picture ?? undefined,
            ...(payload.rawClaims ?? {}),
          },
          payload.provider
        );
        return { synced: true, appUserId };
      } catch (err) {
        return {
          synced: false,
          error: err instanceof Error ? err.message : 'Provisioning failed',
        };
      }
    }
  );

  const preset: AuthentikPreset = createAuthentikPreset({
    relay: relayConfig,
    callback: callbackConfig,
    logout: logoutConfig,
    provisioningAdapter,
  });

  async function onSessionReady(
    claims: OidcClaims,
    provider: string | undefined
  ): Promise<string | undefined> {
    const result: ProvisioningResult = await provisioningAdapter.sync({
      sub: claims.sub,
      iss: claims.iss,
      email: claims.email ?? '',
      emailVerified: claims.email_verified,
      name: claims.name,
      picture: claims.picture,
      provider,
      rawClaims: claims as Record<string, unknown>,
    });
    if (!result.synced) {
      throw new Error(result.error ?? 'Provisioning failed');
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
