import type { ExternalIdentity, LinkedAuthAccount, Principal, ProvisioningEventRecord, UserProjectionRecord } from '../core/types';
import { claimsToExternalIdentity as claimsToExternalIdentityFromSession } from '../core/session';
export declare function externalIdentityToPrincipal(input: {
    issuer: string;
    identity: ExternalIdentity;
    extraMetadata?: Record<string, unknown>;
}): Principal;
export declare function externalIdentityToLinkedAccount(identity: ExternalIdentity, type?: LinkedAuthAccount['type']): LinkedAuthAccount;
export declare function principalToUserProjection(input: {
    principal: Principal;
    externalIdentity: ExternalIdentity;
    appUserId: string;
    status?: string;
}): UserProjectionRecord;
export declare function buildProvisioningEvent(input: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    principal: Principal;
    externalIdentity: ExternalIdentity;
    metadata?: Record<string, unknown>;
}): ProvisioningEventRecord;
export declare const claimsToExternalIdentity: typeof claimsToExternalIdentityFromSession;
