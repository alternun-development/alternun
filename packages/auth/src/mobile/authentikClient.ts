import {
  OIDC_INITIAL_SEARCH,
  clearOidcSession as rawClearOidcSession,
  handleAuthentikCallback as rawHandleAuthentikCallback,
  hasPendingAuthentikCallback as rawHasPendingAuthentikCallback,
  isAuthentikConfigured as rawIsAuthentikConfigured,
  readOidcSession as rawReadOidcSession,
  type AuthentikEnvKeys,
  type AuthentikOidcConfig,
  type OidcClaims,
  type OidcProvider,
  type OidcSession,
  type OidcTokens,
} from '@edcalderon/auth';
import {
  buildAuthentikOAuthFlowStartUrl as buildOauthStartUrl,
  type BuildAuthentikOAuthFlowStartUrlInput,
} from './authentikUrls';

export type AuthentikProviderFlowSlugs = Partial<Record<'google' | 'discord', string>>;

export interface AlternunAuthentikOAuthFlowOptions extends AuthentikOidcConfig {
  forceFreshSession?: boolean;
  providerFlowSlugs?: AuthentikProviderFlowSlugs;
}

const DEFAULT_ENV_KEYS: AuthentikEnvKeys = {
  issuer: 'EXPO_PUBLIC_AUTHENTIK_ISSUER',
  clientId: 'EXPO_PUBLIC_AUTHENTIK_CLIENT_ID',
  redirectUri: 'EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI',
};

const DEFAULT_PENDING_STORAGE_KEY = 'authentik:oidc:pending';
const DEFAULT_PENDING_PROVIDER_KEY = 'alternun:oidc:pending_provider';

interface ResolvedAuthentikClientConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  pendingStorageKey: string;
  pendingProviderKey: string;
  providerSourceSlugs: Record<string, string>;
  sessionStorage: Storage;
}

interface PendingOidcState {
  state: string;
  provider: OidcProvider;
  codeVerifier: string;
  createdAt: number;
}

function getProcessEnv(): Record<string, string | undefined> {
  const maybeProcess = globalThis.process;
  return maybeProcess?.env ?? {};
}

function resolveEnvValue(
  config: AuthentikOidcConfig,
  key: keyof AuthentikEnvKeys
): string | undefined {
  const envKeys = { ...DEFAULT_ENV_KEYS, ...(config.envKeys ?? {}) };
  const explicit =
    key === 'issuer' ? config.issuer : key === 'clientId' ? config.clientId : config.redirectUri;
  if (explicit?.trim()) {
    return explicit.trim();
  }

  const envSource = config.env ?? getProcessEnv();
  const envKey = envKeys[key] ?? DEFAULT_ENV_KEYS[key];
  return envSource[envKey]?.trim();
}

function resolveSessionStorage(config: AuthentikOidcConfig): Storage {
  if (config.sessionStorage) {
    return config.sessionStorage;
  }

  if (!window?.sessionStorage) {
    throw new Error('CONFIG_ERROR: sessionStorage is unavailable in this runtime');
  }

  return window.sessionStorage;
}

function resolveAuthentikClientConfig(
  config: AuthentikOidcConfig = {}
): ResolvedAuthentikClientConfig {
  const issuer = resolveEnvValue(config, 'issuer');
  const clientId = resolveEnvValue(config, 'clientId');
  const redirectUri = resolveEnvValue(config, 'redirectUri');
  const normalizedScope = config.scope?.trim();

  if (!issuer || !clientId || !redirectUri) {
    throw new Error('CONFIG_ERROR: Missing Authentik issuer, clientId, or redirectUri');
  }

  return {
    issuer,
    clientId,
    redirectUri,
    scope: normalizedScope && normalizedScope.length > 0 ? normalizedScope : 'openid profile email',
    pendingStorageKey: config.pendingStorageKey ?? DEFAULT_PENDING_STORAGE_KEY,
    pendingProviderKey: config.pendingStorageKey
      ? `${config.pendingStorageKey}:provider`
      : DEFAULT_PENDING_PROVIDER_KEY,
    providerSourceSlugs: config.providerSourceSlugs ?? {},
    sessionStorage: resolveSessionStorage(config),
  };
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return new Uint8Array(digest);
}

async function buildPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(64);
  const challenge = encodeBase64Url(await sha256(verifier));
  return { verifier, challenge };
}

function buildAuthentikLogoutUrl({
  issuer,
  clientId,
  postLogoutRedirectUri,
  idTokenHint,
}: {
  issuer: string;
  clientId: string;
  postLogoutRedirectUri: string;
  idTokenHint?: string;
}): string {
  const endSessionUrl = new URL(`${issuer.replace(/\/$/, '')}/end-session/`);
  endSessionUrl.searchParams.set('client_id', clientId);
  endSessionUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  if (idTokenHint) {
    endSessionUrl.searchParams.set('id_token_hint', idTokenHint);
  }
  return endSessionUrl.toString();
}

export function buildAlternunAuthentikOAuthFlowStartUrl(
  input: BuildAuthentikOAuthFlowStartUrlInput
): string {
  return buildOauthStartUrl(input);
}

export { buildOauthStartUrl as buildAuthentikOAuthFlowStartUrl };

export function readPendingAuthentikOAuthProvider(
  config: AuthentikOidcConfig = {}
): 'google' | 'discord' | null {
  const key = config.pendingStorageKey
    ? `${config.pendingStorageKey}:provider`
    : DEFAULT_PENDING_PROVIDER_KEY;
  const storage =
    config.sessionStorage ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
  const value = storage?.getItem(key) ?? null;
  if (value === 'google' || value === 'discord') {
    return value;
  }
  return null;
}

export function clearPendingAuthentikOAuthProvider(config: AuthentikOidcConfig = {}): void {
  const key = config.pendingStorageKey
    ? `${config.pendingStorageKey}:provider`
    : DEFAULT_PENDING_PROVIDER_KEY;
  const storage =
    config.sessionStorage ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
  storage?.removeItem(key);
}

function setPendingAuthentikOAuthProvider(
  provider: OidcProvider,
  resolved: ResolvedAuthentikClientConfig
): void {
  resolved.sessionStorage.setItem(resolved.pendingProviderKey, provider);
}

export function isAuthentikConfigured(config: AuthentikOidcConfig = {}): boolean {
  return rawIsAuthentikConfigured(config);
}

export function hasPendingAuthentikCallback(searchString?: string): boolean {
  return rawHasPendingAuthentikCallback(searchString);
}

export function readOidcSession(config: AuthentikOidcConfig = {}): OidcSession | null {
  return rawReadOidcSession(config);
}

export function clearOidcSession(config: AuthentikOidcConfig = {}): void {
  clearPendingAuthentikOAuthProvider(config);
  rawClearOidcSession(config);
}

export async function startAuthentikOAuthFlow(
  provider: OidcProvider,
  config: AlternunAuthentikOAuthFlowOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('CONFIG_ERROR: startAuthentikOAuthFlow requires a browser runtime');
  }

  const resolved = resolveAuthentikClientConfig(config);

  if (config.forceFreshSession) {
    setPendingAuthentikOAuthProvider(provider, resolved);
    const currentSession = rawReadOidcSession(config);
    window.location.assign(
      buildAuthentikLogoutUrl({
        issuer: resolved.issuer,
        clientId: resolved.clientId,
        postLogoutRedirectUri: `${window.location.origin}/`,
        idTokenHint: currentSession?.tokens.idToken,
      })
    );
    return;
  }

  clearPendingAuthentikOAuthProvider(config);

  const { verifier, challenge } = await buildPkcePair();
  const state = randomString(32);
  const pendingState: PendingOidcState = {
    state,
    provider,
    codeVerifier: verifier,
    createdAt: Date.now(),
  };

  resolved.sessionStorage.setItem(resolved.pendingStorageKey, JSON.stringify(pendingState));
  resolved.sessionStorage.setItem(OIDC_INITIAL_SEARCH, window.location.search || '');

  window.location.assign(
    buildOauthStartUrl({
      providerHint: provider,
      issuer: resolved.issuer,
      clientId: resolved.clientId,
      redirectUri: resolved.redirectUri,
      state,
      codeChallenge: challenge,
      scope: resolved.scope,
      providerFlowSlugs: config.providerFlowSlugs,
      providerSourceSlugs: resolved.providerSourceSlugs,
    })
  );
}

export async function handleAuthentikCallback(
  searchString?: string,
  config: AuthentikOidcConfig = {}
): Promise<OidcSession> {
  const session = await rawHandleAuthentikCallback(searchString, config);
  clearPendingAuthentikOAuthProvider(config);
  return session;
}

export {
  OIDC_INITIAL_SEARCH,
  type AuthentikOidcConfig,
  type OidcClaims,
  type OidcProvider,
  type OidcSession,
  type OidcTokens,
};
