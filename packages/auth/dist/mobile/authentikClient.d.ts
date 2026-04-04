import {
  OIDC_INITIAL_SEARCH,
  type AuthentikOidcConfig,
  type OidcClaims,
  type OidcProvider,
  type OidcSession,
  type OidcTokens,
} from '@edcalderon/auth';
import { type BuildAuthentikOAuthFlowStartUrlInput } from './authentikUrls';
export type AuthentikProviderFlowSlugs = Partial<Record<'google' | 'discord', string>>;
export interface AlternunAuthentikOAuthFlowOptions extends AuthentikOidcConfig {
  forceFreshSession?: boolean;
  providerFlowSlugs?: AuthentikProviderFlowSlugs;
}
export declare function buildAlternunAuthentikOAuthFlowStartUrl(
  input: BuildAuthentikOAuthFlowStartUrlInput
): string;
export { buildAuthentikOAuthFlowStartUrl, resolveAuthentikRedirectUri } from './authentikUrls';
export declare function readPendingAuthentikOAuthProvider(
  config?: AuthentikOidcConfig
): 'google' | 'discord' | null;
export declare function clearPendingAuthentikOAuthProvider(config?: AuthentikOidcConfig): void;
export declare function isAuthentikConfigured(config?: AuthentikOidcConfig): boolean;
export declare function hasPendingAuthentikCallback(searchString?: string): boolean;
export declare function readOidcSession(config?: AuthentikOidcConfig): OidcSession | null;
export declare function clearOidcSession(config?: AuthentikOidcConfig): void;
export declare function startAuthentikOAuthFlow(
  provider: OidcProvider,
  config?: AlternunAuthentikOAuthFlowOptions
): Promise<void>;
export declare function handleAuthentikCallback(
  searchString?: string,
  config?: AuthentikOidcConfig
): Promise<OidcSession>;
export {
  OIDC_INITIAL_SEARCH,
  type AuthentikOidcConfig,
  type OidcClaims,
  type OidcProvider,
  type OidcSession,
  type OidcTokens,
};
