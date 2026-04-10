import { buildLinkedAccountsFromIdentity, claimsToExternalIdentity as claimsToExternalIdentityFromSession } from '../core/session.js';
import { createPrincipalFromIdentity } from './principal.js';
export function externalIdentityToPrincipal(input) {
    return createPrincipalFromIdentity(input);
}
export function externalIdentityToLinkedAccount(identity, type = 'oidc') {
    return buildLinkedAccountsFromIdentity(identity, type)[0];
}
export function principalToUserProjection(input) {
    var _a, _b;
    return {
        appUserId: input.appUserId,
        principal: input.principal,
        email: input.externalIdentity.email,
        displayName: input.externalIdentity.displayName,
        avatarUrl: input.externalIdentity.avatarUrl,
        status: (_a = input.status) !== null && _a !== void 0 ? _a : 'active',
        metadata: {
            ...input.principal.metadata,
            externalProvider: input.externalIdentity.provider,
            externalProviderUserId: input.externalIdentity.providerUserId,
            emailVerified: (_b = input.externalIdentity.emailVerified) !== null && _b !== void 0 ? _b : false,
        },
    };
}
export function buildProvisioningEvent(input) {
    var _a;
    return {
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: {
            principal: input.principal,
            externalIdentity: input.externalIdentity,
            metadata: (_a = input.metadata) !== null && _a !== void 0 ? _a : {},
        },
        status: 'pending',
        attempts: 0,
    };
}
export const claimsToExternalIdentity = claimsToExternalIdentityFromSession;
