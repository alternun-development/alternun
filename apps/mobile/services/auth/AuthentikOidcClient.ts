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
 *        → redirects to /if/flow/<provider-login-flow>/?next=/application/o/authorize/?...
 *           (provider-specific Authentik flow that immediately drops into the matching
 *            Google/Discord source stage, instead of showing /if/user/#/library)
 *   2. Social provider authenticates → returns to Authentik
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

// ─── Config helpers ──────────────────────────────────────────────────────────

/**
 * Authentik's OIDC discovery document uses a GLOBAL authorize/token/userinfo
 * endpoint at `/application/o/<verb>/`, NOT a per-application path like
 * `/application/o/<slug>/<verb>/`.  Given the issuer URL
 * `https://host/application/o/<slug>/` this returns the base
 * `https://host/application/o/` so callers can append the verb they need.
 *
 * Falls back to the raw issuer if the expected pattern is not found so that
 * non-Authentik issuers still get a sensible (though potentially wrong) URL.
 */
function getAuthentikEndpointBase(): string {
  return getAuthentikEndpointBaseFromIssuer(getAuthentikIssuer());
}

function getAuthentikEndpointBaseFromIssuer(issuer: string): string {
  // Strip the slug segment: .../application/o/<slug>/ → .../application/o/
  const match = issuer.match(/^(https?:\/\/.+?\/application\/o\/)/);
  if (match) return match[1];
  // Fallback: strip trailing slug (one path segment) from issuer
  return issuer.replace(/\/$/, '').replace(/\/[^/]+$/, '/');
}

function getAuthentikIssuer(): string {
  return process.env.EXPO_PUBLIC_AUTHENTIK_ISSUER ?? '';
}

function getAuthentikClientId(): string {
  return process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID ?? '';
}

function getAuthentikRedirectUri(): string {
  return (
    process.env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI ??
    (typeof window !== 'undefined' ? `${window.location.origin}/` : '')
  );
}

function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URI ?? '';
}

function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export function buildAuthentikOAuthFlowStartUrl({
  providerHint,
  issuer,
  clientId,
  redirectUri,
  state,
  codeChallenge,
}: {
  providerHint: 'google' | 'discord';
  issuer: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const authorizeUrl = `${getAuthentikEndpointBaseFromIssuer(issuer)}authorize/`;
  const authorizeParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authentikOrigin = new URL(issuer).origin;
  const authorizePath = authorizeUrl.replace(authentikOrigin, '');
  const nextPath = `${authorizePath}?${authorizeParams.toString()}`;
  const loginFlowSlug = getAuthentikLoginFlowSlug(providerHint);

  return `${authentikOrigin}/if/flow/${loginFlowSlug}/?next=${encodeURIComponent(nextPath)}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

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
  expiresAt: number; // unix ms
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const PKCE_KEY = 'alternun:oidc:pkce_verifier';
const STATE_KEY = 'alternun:oidc:state';
const SESSION_KEY = 'alternun:oidc:session';

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  const verifier = base64UrlEncode(array.buffer);
  const challenge = base64UrlEncode(await sha256(verifier));
  return { verifier, challenge };
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

function getAuthentikLoginFlowSlug(providerHint: 'google' | 'discord'): string {
  switch (providerHint) {
    case 'google':
      return 'alternun-google-login';
    case 'discord':
      return 'alternun-discord-login';
  }
}

// ─── JWT decode (no verification — claims already came from userinfo endpoint) ──

export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return {};
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ─── Supabase RPC upsert ──────────────────────────────────────────────────────

interface UpsertOidcUserResult {
  id: string;
  sub: string;
  iss: string;
  email: string | null;
  email_verified: boolean;
  name: string | null;
  picture: string | null;
  provider: string | null;
}

async function upsertOidcUser(claims: OidcClaims, provider: string | undefined): Promise<string> {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'CONFIG_ERROR: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY must be set.'
    );
  }

  const iss = claims.iss ?? getAuthentikIssuer();

  const body = {
    p_sub: claims.sub,
    p_iss: iss,
    p_email: claims.email ?? null,
    p_email_verified: claims.email_verified ?? false,
    p_name: claims.name ?? null,
    p_picture: claims.picture ?? null,
    p_provider: provider ?? null,
    p_raw_claims: claims,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_oidc_user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to upsert user: ${res.status} ${text}`);
  }

  const data = (await res.json()) as UpsertOidcUserResult;
  return data.id;
}

// ─── Userinfo ─────────────────────────────────────────────────────────────────

async function fetchUserinfo(accessToken: string): Promise<OidcClaims> {
  if (!getAuthentikIssuer()) {
    throw new Error('CONFIG_ERROR: EXPO_PUBLIC_AUTHENTIK_ISSUER must be set.');
  }

  const userinfoUrl = `${getAuthentikEndpointBase()}userinfo/`;

  const res = await fetch(userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Userinfo request failed: ${res.status}`);
  }

  return (await res.json()) as OidcClaims;
}

// ─── Token exchange ───────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
  const clientId = getAuthentikClientId();
  const redirectUri = getAuthentikRedirectUri();

  if (!getAuthentikIssuer() || !clientId) {
    throw new Error(
      'CONFIG_ERROR: EXPO_PUBLIC_AUTHENTIK_ISSUER and EXPO_PUBLIC_AUTHENTIK_CLIENT_ID must be set.'
    );
  }

  const tokenUrl = `${getAuthentikEndpointBase()}token/`;

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TokenResponse;
}

// ─── Session storage ──────────────────────────────────────────────────────────

export function readOidcSession(): OidcSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as OidcSession;
    // Treat expired sessions as absent
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearOidcSession(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

function saveOidcSession(session: OidcSession): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// ─── Module-level URL snapshot ────────────────────────────────────────────────
// Captured synchronously at import time — before Expo Router or any useEffect
// can modify window.location. This is the only reliable way to read the OIDC
// callback params (?code=&state=) because React effects run after routing.

export const OIDC_INITIAL_SEARCH: string =
  typeof window !== 'undefined' ? window.location?.search ?? '' : '';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true when the minimum Authentik env vars are present.
 * Use this to conditionally show Authentik-only buttons (e.g. Discord).
 */
export function isAuthentikConfigured(): boolean {
  return Boolean(getAuthentikIssuer() && getAuthentikClientId());
}

/**
 * Returns true when the given search string (or current URL) looks like an
 * Authentik OIDC callback (i.e. has `?code=...&state=...`).
 *
 * @param searchString  Pass `OIDC_INITIAL_SEARCH` to check the URL as it was
 *   at module-load time, before any router had a chance to modify it.
 */
export function hasPendingAuthentikCallback(searchString?: string): boolean {
  const search = searchString ?? (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(search);
  return Boolean(params.get('code') && params.get('state'));
}

/**
 * Starts the Authentik OIDC authorization flow.
 *
 * Instead of going to /application/o/authorize/?hint=<provider> (which still
 * shows the Authentik login page because the mobile authorization flow has no
 * identification stage), we redirect to a provider-specific Authentik flow.
 *
 * Flow:
 *   1. Browser → /if/flow/alternun-google-login/?next=/application/o/authorize/?...
 *   2. Authentik → Google OAuth (no Authentik library page shown)
 *   3. Google  → returns to Authentik and resumes the flow
 *   4. Authentik follows `next` → /application/o/authorize/?...
 *   5. Authorization flow (implicit consent, 0 stages) → issues PKCE code
 *   6. Authentik → https://testnet.airs.alternun.co/?code=XXX&state=YYY
 *   7. App handles callback as before
 *
 * @param providerHint  'google' | 'discord' — provider-specific login flow key.
 */
export async function startAuthentikOAuthFlow(providerHint: 'google' | 'discord'): Promise<void> {
  const issuer = getAuthentikIssuer();
  const clientId = getAuthentikClientId();
  const redirectUri = getAuthentikRedirectUri();

  if (!issuer || !clientId) {
    throw new Error(
      'CONFIG_ERROR: EXPO_PUBLIC_AUTHENTIK_ISSUER and EXPO_PUBLIC_AUTHENTIK_CLIENT_ID must be set.'
    );
  }

  const { verifier, challenge } = await generatePkce();
  const state = generateState();

  sessionStorage.setItem(PKCE_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  // The provider-specific Authentik flow contains a SourceStage bound to the
  // matching social source. That keeps login off the generic dashboard/library
  // page while still letting Authentik resume into the OIDC authorization.
  window.location.href = buildAuthentikOAuthFlowStartUrl({
    providerHint,
    issuer,
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
  });
}

/**
 * Call this on the page that receives the redirect from Authentik.
 * Returns the fully-resolved OidcSession or throws on error.
 *
 * @param searchString  Optional snapshot of `window.location.search` captured
 *   before the caller strips the URL. Pass this to avoid race conditions in
 *   React StrictMode where the effect may run a second time after the URL has
 *   already been cleaned up.
 */
export async function handleAuthentikCallback(searchString?: string): Promise<OidcSession> {
  const params = new URLSearchParams(searchString ?? window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');

  if (!code) {
    throw new Error('OIDC callback is missing `code` parameter.');
  }

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const codeVerifier = sessionStorage.getItem(PKCE_KEY);

  // Clean up PKCE artifacts immediately
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(PKCE_KEY);

  if (!expectedState || returnedState !== expectedState) {
    throw new Error('OIDC state mismatch — possible CSRF attack.');
  }

  if (!codeVerifier) {
    throw new Error('PKCE verifier missing from session storage.');
  }

  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  const claims = await fetchUserinfo(tokens.access_token);

  // Determine which social provider was used by inspecting the id_token or
  // falling back to the 'source' claim Authentik includes in userinfo.
  let provider: string | undefined;
  if (tokens.id_token) {
    const idPayload = decodeJwtPayload(tokens.id_token);
    const source =
      (idPayload.source as string | undefined) ?? (idPayload.amr as string[] | undefined)?.[0];
    if (source) provider = source;
  }
  if (!provider) {
    // Authentik sometimes includes 'source' directly in the userinfo claims
    provider = (claims as Record<string, unknown>).source as string | undefined;
  }

  const appUserId = await upsertOidcUser(claims, provider);

  const expiresIn = tokens.expires_in ?? 3600;
  const session: OidcSession = {
    appUserId,
    sub: claims.sub,
    iss: claims.iss ?? getAuthentikIssuer(),
    email: claims.email,
    emailVerified: claims.email_verified ?? false,
    name: claims.name,
    picture: claims.picture,
    provider,
    rawClaims: claims,
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  saveOidcSession(session);
  return session;
}
