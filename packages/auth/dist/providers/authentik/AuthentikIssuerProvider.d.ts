import type { OidcSession } from '@edcalderon/auth';
import type {
  AlternunSession,
  ClaimValidationResult,
  ExecutionSession,
  IdentityExchangeInput,
  IssuerDiscoveryConfig,
  IssuerSession,
} from '../../core/types';
import type { IdentityIssuerProvider, IdentityRepositoryContract } from '../../core/contracts';
export interface AuthentikIssuerProviderOptions {
  identityRepository: IdentityRepositoryContract;
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
  sessionStorage?: Storage;
  defaultAudience?: string;
  authExchangeUrl?: string;
  fetchFn?: typeof fetch;
}
export declare class AuthentikIssuerProvider implements IdentityIssuerProvider {
  private readonly options;
  readonly name: 'authentik';
  private cachedSession;
  private readonly issuer;
  private readonly redirectUri;
  private readonly clientId;
  private readonly authExchangeUrl;
  constructor(options: AuthentikIssuerProviderOptions);
  private get fetchFn();
  private buildBackendExchangeRequest;
  private normalizeBackendExchangeResponse;
  private exchangeIdentityViaBackend;
  private exchangeIdentityLocally;
  exchangeIdentity(input: IdentityExchangeInput): Promise<AlternunSession>;
  getIssuerSession(): Promise<IssuerSession | null>;
  refreshIssuerSession(): Promise<IssuerSession | null>;
  logoutIssuerSession(options?: { reason?: string; redirectTo?: string | null }): Promise<void>;
  discoverIssuerConfig(): Promise<IssuerDiscoveryConfig>;
  validateClaims(
    claims: Record<string, unknown>,
    options?: {
      issuer?: string;
      audience?: string | string[];
    }
  ): Promise<ClaimValidationResult>;
}
export declare function oidcSessionToExecutionSession(session: OidcSession): ExecutionSession;
export declare function issuerSessionToCompatUser(
  session: IssuerSession | null
): import('@edcalderon/auth').User | null;
