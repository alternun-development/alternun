export function createAlternunSession(input) {
    var _a, _b;
    return {
        issuerAccessToken: input.issuerSession.accessToken,
        issuerRefreshToken: (_a = input.issuerSession.refreshToken) !== null && _a !== void 0 ? _a : null,
        executionSession: (_b = input.executionSession) !== null && _b !== void 0 ? _b : null,
        principal: input.issuerSession.principal,
        linkedAccounts: input.issuerSession.linkedAccounts,
    };
}
export function principalToUser(principal, overrides = {}) {
    var _a, _b;
    return {
        id: (_a = overrides.id) !== null && _a !== void 0 ? _a : principal.subject,
        email: principal.email,
        avatarUrl: overrides.avatarUrl,
        provider: overrides.provider,
        providerUserId: overrides.providerUserId,
        roles: principal.roles,
        metadata: {
            ...principal.metadata,
            ...((_b = overrides.metadata) !== null && _b !== void 0 ? _b : {}),
        },
    };
}
export function executionSessionToUser(session, fallbackPrincipal) {
    if (!session) {
        return fallbackPrincipal ? principalToUser(fallbackPrincipal) : null;
    }
    const identity = session.externalIdentity;
    if (identity) {
        return {
            id: identity.providerUserId,
            email: identity.email,
            avatarUrl: identity.avatarUrl,
            provider: identity.provider,
            providerUserId: identity.providerUserId,
            metadata: {
                ...identity.rawClaims,
            },
        };
    }
    if (fallbackPrincipal) {
        return principalToUser(fallbackPrincipal, {
            provider: session.provider,
            providerUserId: session.raw.providerUserId,
            metadata: session.raw,
        });
    }
    return null;
}
export function issuerSessionToUser(session, fallbackExecution) {
    var _a;
    if (!session) {
        return executionSessionToUser(fallbackExecution !== null && fallbackExecution !== void 0 ? fallbackExecution : null);
    }
    return principalToUser(session.principal, {
        id: session.principal.subject,
        provider: fallbackExecution === null || fallbackExecution === void 0 ? void 0 : fallbackExecution.provider,
        providerUserId: (_a = fallbackExecution === null || fallbackExecution === void 0 ? void 0 : fallbackExecution.externalIdentity) === null || _a === void 0 ? void 0 : _a.providerUserId,
        metadata: {
            claims: session.claims,
            executionProvider: fallbackExecution === null || fallbackExecution === void 0 ? void 0 : fallbackExecution.provider,
        },
    });
}
export function buildLinkedAccountsFromIdentity(identity, type = 'oidc') {
    var _a;
    return [
        {
            provider: identity.provider,
            providerUserId: identity.providerUserId,
            type,
            email: identity.email,
            displayName: identity.displayName,
            metadata: {
                emailVerified: (_a = identity.emailVerified) !== null && _a !== void 0 ? _a : false,
                ...identity.rawClaims,
            },
        },
    ];
}
export function claimsToExternalIdentity(provider, claims, providerUserId) {
    var _a, _b;
    const rawClaims = claims;
    const resolvedProviderUserId = (_b = (_a = providerUserId !== null && providerUserId !== void 0 ? providerUserId : (typeof rawClaims.sub === 'string' ? rawClaims.sub : undefined)) !== null && _a !== void 0 ? _a : (typeof rawClaims.providerUserId === 'string' ? rawClaims.providerUserId : undefined)) !== null && _b !== void 0 ? _b : provider;
    return {
        provider,
        providerUserId: resolvedProviderUserId,
        email: typeof rawClaims.email === 'string' ? rawClaims.email : undefined,
        emailVerified: typeof rawClaims.email_verified === 'boolean' ? rawClaims.email_verified : undefined,
        displayName: typeof rawClaims.name === 'string'
            ? rawClaims.name
            : typeof rawClaims.preferred_username === 'string'
                ? rawClaims.preferred_username
                : undefined,
        avatarUrl: typeof rawClaims.picture === 'string' ? rawClaims.picture : undefined,
        rawClaims,
    };
}
