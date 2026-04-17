import type { AlternunSession, ClaimValidationResult, IdentityExchangeInput, IssuerDiscoveryConfig, IssuerSession } from '../../core/types';
import type { IdentityIssuerProvider, IdentityRepositoryContract } from '../../core/contracts';
export interface SupabaseLegacyIssuerProviderOptions {
    identityRepository: IdentityRepositoryContract;
    issuer?: string;
    clientId?: string;
    redirectUri?: string;
}
export declare class SupabaseLegacyIssuerProvider implements IdentityIssuerProvider {
    private readonly options;
    readonly name: "supabase-legacy";
    private cachedSession;
    private readonly issuer;
    constructor(options: SupabaseLegacyIssuerProviderOptions);
    exchangeIdentity(input: IdentityExchangeInput): Promise<AlternunSession>;
    getIssuerSession(): Promise<IssuerSession | null>;
    refreshIssuerSession(): Promise<IssuerSession | null>;
    logoutIssuerSession(): Promise<void>;
    discoverIssuerConfig(): Promise<IssuerDiscoveryConfig>;
    validateClaims(claims: Record<string, unknown>): Promise<ClaimValidationResult>;
}
