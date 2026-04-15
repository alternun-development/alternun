import type { ExternalIdentity, Principal } from '../core/types';
export declare function resolvePrincipalRoles(rawClaims: Record<string, unknown>): string[];
export declare function resolvePrincipalMetadata(identity: ExternalIdentity, extra?: Record<string, unknown>): Record<string, unknown>;
export declare function createPrincipalFromIdentity(input: {
    issuer: string;
    identity: ExternalIdentity;
    extraMetadata?: Record<string, unknown>;
}): Principal;
