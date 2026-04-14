import type { OidcClaims, User } from '@edcalderon/auth';
import type { AlternunSession, ExecutionSession, ExternalIdentity, IssuerSession, LinkedAuthAccount, Principal } from './types';
export declare function createAlternunSession(input: {
    issuerSession: IssuerSession;
    executionSession?: ExecutionSession | null;
}): AlternunSession;
export declare function principalToUser(principal: Principal, overrides?: {
    id?: string;
    avatarUrl?: string;
    provider?: string;
    providerUserId?: string;
    metadata?: Record<string, unknown>;
}): User;
export declare function executionSessionToUser(session: ExecutionSession | null, fallbackPrincipal?: Principal | null): User | null;
export declare function issuerSessionToUser(session: IssuerSession | null, fallbackExecution?: ExecutionSession | null): User | null;
export declare function buildLinkedAccountsFromIdentity(identity: ExternalIdentity, type?: LinkedAuthAccount['type']): LinkedAuthAccount[];
export declare function claimsToExternalIdentity(provider: string, claims: OidcClaims | Record<string, unknown>, providerUserId?: string): ExternalIdentity;
