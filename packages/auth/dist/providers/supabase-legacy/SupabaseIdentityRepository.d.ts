import type { OidcClaims } from '@edcalderon/auth';
import type { LinkedAuthAccount, Principal, PrincipalRecord, ProvisioningEventRecord, UserProjectionRecord } from '../../core/types';
import type { IdentityRepositoryContract } from '../../core/contracts';
export interface SupabaseIdentityRepositoryOptions {
    supabaseUrl?: string;
    supabaseKey?: string;
    fetchFn?: typeof fetch;
    upsertRpcName?: string;
    legacyUpsertFn?: (claims: OidcClaims, provider?: string) => Promise<string>;
}
export declare class SupabaseIdentityRepository implements IdentityRepositoryContract {
    private readonly options;
    readonly name: "supabase";
    constructor(options?: SupabaseIdentityRepositoryOptions);
    private requireTransport;
    upsertPrincipal(input: {
        principal: Principal;
        externalIdentity?: import('../../core/types').ExternalIdentity | null;
        source?: string;
    }): Promise<PrincipalRecord>;
    findPrincipalByExternalIdentity(input: {
        externalIdentity: import('../../core/types').ExternalIdentity;
    }): Promise<PrincipalRecord | null>;
    upsertUserProjection(input: UserProjectionRecord): Promise<UserProjectionRecord>;
    upsertLinkedAccount(input: {
        principalId?: string;
        principal: Principal;
        linkedAccount: LinkedAuthAccount;
    }): Promise<LinkedAuthAccount>;
    recordProvisioningEvent(input: ProvisioningEventRecord): Promise<void>;
}
export declare function createSupabaseIdentityRepository(options?: SupabaseIdentityRepositoryOptions): SupabaseIdentityRepository;
