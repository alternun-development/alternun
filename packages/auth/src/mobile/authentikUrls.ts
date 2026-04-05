export interface BuildAuthentikOAuthFlowStartUrlInput {
  providerHint: string;
  issuer: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
  providerFlowSlugs?: Record<string, string>;
  providerSourceSlugs?: Record<string, string>;
}

const DEFAULT_SCOPE = 'openid profile email';
export const DEFAULT_AUTHENTIK_CLIENT_ID = 'alternun-mobile';
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function isLoopbackHostname(value: string | undefined | null): boolean {
  const hostname = value?.trim().toLowerCase();
  return Boolean(hostname && LOOPBACK_HOSTNAMES.has(hostname));
}

function shouldPreferBrowserOrigin(
  explicitRedirectUri: string,
  browserOrigin?: string | null
): boolean {
  if (!browserOrigin?.trim()) {
    return false;
  }

  try {
    const explicitUrl = new URL(explicitRedirectUri);
    return isLoopbackHostname(explicitUrl.hostname);
  } catch {
    return false;
  }
}

function deriveAuthentikIssuerFromBrowserOrigin(
  browserOrigin: string,
  clientId: string
): string | undefined {
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
    return `${origin.protocol}//${hostnameParts.join('.')}/application/o/${encodeURIComponent(
      clientId
    )}/`;
  } catch {
    return undefined;
  }
}

export function resolveAuthentikClientId(
  explicitClientId: string | undefined | null
): string | undefined {
  const normalizedExplicitClientId = explicitClientId?.trim();
  if (normalizedExplicitClientId) {
    return normalizedExplicitClientId;
  }

  return DEFAULT_AUTHENTIK_CLIENT_ID;
}

export function resolveAuthentikIssuer(
  explicitIssuer: string | undefined | null,
  browserOrigin?: string | null,
  clientId: string = DEFAULT_AUTHENTIK_CLIENT_ID
): string | undefined {
  const normalizedExplicitIssuer = explicitIssuer?.trim();
  if (normalizedExplicitIssuer) {
    return normalizedExplicitIssuer;
  }

  const normalizedBrowserOrigin = browserOrigin?.trim();
  if (!normalizedBrowserOrigin) {
    return undefined;
  }

  return deriveAuthentikIssuerFromBrowserOrigin(normalizedBrowserOrigin, clientId);
}

export function resolveAuthentikRedirectUri(
  explicitRedirectUri: string | undefined | null,
  browserOrigin?: string | null
): string | undefined {
  const normalizedExplicitRedirectUri = explicitRedirectUri?.trim();
  if (
    normalizedExplicitRedirectUri &&
    !shouldPreferBrowserOrigin(normalizedExplicitRedirectUri, browserOrigin)
  ) {
    return normalizedExplicitRedirectUri;
  }

  const normalizedBrowserOrigin = browserOrigin?.trim();
  if (!normalizedBrowserOrigin) {
    return undefined;
  }

  return normalizedBrowserOrigin.endsWith('/')
    ? normalizedBrowserOrigin
    : `${normalizedBrowserOrigin}/`;
}

export function getAuthentikEndpointBaseFromIssuer(issuer: string): string {
  const match = issuer.match(/^(https?:\/\/.+?\/application\/o\/)/);
  if (match) {
    return match[1];
  }

  return issuer.replace(/\/$/, '').replace(/\/[^/]+$/, '/');
}

export function buildAuthentikOAuthFlowStartUrl({
  providerHint,
  issuer,
  clientId,
  redirectUri,
  state,
  codeChallenge,
  scope,
  providerFlowSlugs,
  providerSourceSlugs,
}: BuildAuthentikOAuthFlowStartUrlInput): string {
  const normalizedScope = scope?.trim();
  const authorizeUrl = new URL(`${getAuthentikEndpointBaseFromIssuer(issuer)}authorize/`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set(
    'scope',
    normalizedScope && normalizedScope.length > 0 ? normalizedScope : DEFAULT_SCOPE
  );
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  const authentikOrigin = new URL(issuer).origin;
  const flowSlug = providerFlowSlugs?.[providerHint]?.trim();

  if (flowSlug) {
    return `${authentikOrigin}/if/flow/${encodeURIComponent(flowSlug)}/?next=${encodeURIComponent(
      authorizeUrl.toString()
    )}`;
  }

  const sourceSlugCandidate = providerSourceSlugs?.[providerHint];
  const sourceSlug =
    sourceSlugCandidate != null && sourceSlugCandidate.trim().length > 0
      ? sourceSlugCandidate.trim()
      : providerHint;
  return `${authentikOrigin}/source/oauth/login/${encodeURIComponent(
    sourceSlug
  )}/?next=${encodeURIComponent(authorizeUrl.toString())}`;
}
