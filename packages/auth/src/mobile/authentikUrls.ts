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
