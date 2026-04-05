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
export declare const DEFAULT_AUTHENTIK_CLIENT_ID = 'alternun-mobile';
export declare function resolveAuthentikClientId(
  explicitClientId: string | undefined | null
): string | undefined;
export declare function resolveAuthentikIssuer(
  explicitIssuer: string | undefined | null,
  browserOrigin?: string | null,
  clientId?: string
): string | undefined;
export declare function resolveAuthentikRedirectUri(
  explicitRedirectUri: string | undefined | null,
  browserOrigin?: string | null
): string | undefined;
export declare function getAuthentikEndpointBaseFromIssuer(issuer: string): string;
export declare function buildAuthentikOAuthFlowStartUrl({
  providerHint,
  issuer,
  clientId,
  redirectUri,
  state,
  codeChallenge,
  scope,
  providerFlowSlugs,
  providerSourceSlugs,
}: BuildAuthentikOAuthFlowStartUrlInput): string;
