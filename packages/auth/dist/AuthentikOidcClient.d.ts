/**
 * Authentik OIDC client with PKCE for web runtime apps.
 *
 * ── Authentik setup requirements ─────────────────────────────────────────────
 *
 *  1. Create an OAuth2/OIDC provider (type: Authorization Code + PKCE).
 *     - Client type: Public (no client secret)
 *     - Redirect URIs: your app origin (e.g. https://myapp.com/)
 *     - Authorization flow: default-provider-authorization-implicit-consent
 *       (0 stage bindings — implicit consent fires immediately once logged in)
 *
 *  2. Create an Application and bind it to the provider.
 *
 *  3. Create OAuth Sources for each social provider (Google, Discord, …).
 *     - Google source slug:  "google"
 *     - Discord source slug: "discord"
 *     - Google requires https://<authentik-host>/source/oauth/callback/google/
 *       to be registered as an Authorized Redirect URI in Google Cloud Console.
 *
 *  4. Known Authentik 2026.2.1 bug — IntegrityError in handle_existing_link:
 *     When an authenticated session user re-authenticates via a social source,
 *     flow_manager.py line 306 calls connection.save() on a new (pk=None)
 *     UserSourceConnection, hitting the (user_id, source_id) unique constraint.
 *     Hot-patch fix applied to production:
 *       connection.save()  →  type(connection).objects.update_or_create(
 *                               user=connection.user,
 *                               source=connection.source,
 *                               defaults={"identifier": connection.identifier},
 *                             )
 *     Reported to Authentik upstream. Re-apply after container image upgrades.
 *
 * ── Auth flow ─────────────────────────────────────────────────────────────────
 *
 *   1. startAuthentikOAuthFlow('google' | 'discord')
 *        → generates PKCE verifier+challenge, stores in sessionStorage
 *        → redirects to /source/oauth/login/<slug>/?next=/application/o/authorize/?...
 *           (bypasses Authentik login page entirely — user sees only Google/Discord UI)
 *   2. Social provider authenticates → redirects to Authentik's OAuth callback
 *   3. Authentik follows `next` → runs authorization flow (implicit consent)
 *   4. Authentik redirects to app with ?code=...&state=...
 *   5. handleAuthentikCallback()
 *        → validates state, retrieves PKCE verifier from sessionStorage
 *        → exchanges code for access + id tokens via /application/o/token/
 *        → fetches userinfo from /application/o/userinfo/
 *        → upserts user via Supabase SECURITY DEFINER RPC upsert_oidc_user()
 *        → saves OidcSession to localStorage
 *
 * ── Required env vars ─────────────────────────────────────────────────────────
 *
 *   EXPO_PUBLIC_AUTHENTIK_ISSUER      https://<host>/application/o/<app-slug>/
 *   EXPO_PUBLIC_AUTHENTIK_CLIENT_ID   <oauth2-provider-client-id>
 *   EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI  https://<app-origin>/   (must match Authentik + app)
 *   EXPO_PUBLIC_SUPABASE_URL          (for upsert_oidc_user RPC)
 *   EXPO_PUBLIC_SUPABASE_KEY          (anon key — no service role needed)
 */
export interface OidcClaims {
  sub: string;
  iss?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  /** Authentik groups claim */
  groups?: string[];
  [key: string]: unknown;
}
export interface OidcSession {
  appUserId: string;
  sub: string;
  iss: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  provider?: string;
  rawClaims: OidcClaims;
  accessToken: string;
  idToken?: string;
  expiresAt: number;
}
export declare function decodeJwtPayload(jwt: string): Record<string, unknown>;
export declare function readOidcSession(): OidcSession | null;
export declare function clearOidcSession(): void;
export declare const OIDC_INITIAL_SEARCH: string;
/**
 * Returns true when the minimum Authentik env vars are present.
 * Use this to conditionally show Authentik-only buttons (e.g. Discord).
 */
export declare function isAuthentikConfigured(): boolean;
/**
 * Returns true when the given search string (or current URL) looks like an
 * Authentik OIDC callback (i.e. has `?code=...&state=...`).
 *
 * @param searchString  Pass `OIDC_INITIAL_SEARCH` to check the URL as it was
 *   at module-load time, before any router had a chance to modify it.
 */
export declare function hasPendingAuthentikCallback(searchString?: string): boolean;
/**
 * Starts the Authentik OIDC authorization flow.
 *
 * Instead of going to /application/o/authorize/?hint=<provider> (which still
 * shows the Authentik login page because the mobile authorization flow has no
 * identification stage), we redirect to Authentik's social source login
 * endpoint: /source/oauth/login/<slug>/
 *
 * Flow:
 *   1. Browser → /source/oauth/login/google/?next=/application/o/authorize/?...
 *   2. Authentik → Google OAuth (no Authentik UI shown)
 *   3. Google  → /source/oauth/callback/google/
 *   4. Authentik (user now logged in) → follows `next` → /application/o/authorize/?...
 *   5. Authorization flow (implicit consent, 0 stages) → issues PKCE code
 *   6. Authentik → https://testnet.airs.alternun.co/?code=XXX&state=YYY
 *   7. App handles callback as before
 *
 * @param providerHint  'google' | 'discord' — slug of the Authentik OAuth source.
 */
export declare function startAuthentikOAuthFlow(providerHint: 'google' | 'discord'): Promise<void>;
/**
 * Call this on the page that receives the redirect from Authentik.
 * Returns the fully-resolved OidcSession or throws on error.
 *
 * @param searchString  Optional snapshot of `window.location.search` captured
 *   before the caller strips the URL. Pass this to avoid race conditions in
 *   React StrictMode where the effect may run a second time after the URL has
 *   already been cleaned up.
 */
export declare function handleAuthentikCallback(searchString?: string): Promise<OidcSession>;
