export function resolvePrincipalRoles(rawClaims) {
    const candidates = [
        rawClaims.alternun_roles,
        rawClaims.roles,
        rawClaims.role,
        rawClaims.app_roles,
    ];
    const roles = new Set();
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            for (const entry of candidate) {
                if (typeof entry === 'string' && entry.trim()) {
                    roles.add(entry.trim());
                }
            }
            continue;
        }
        if (typeof candidate === 'string' && candidate.trim()) {
            roles.add(candidate.trim());
        }
    }
    if (roles.size === 0) {
        roles.add('authenticated');
    }
    return Array.from(roles);
}
export function resolvePrincipalMetadata(identity, extra = {}) {
    var _a;
    return {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        emailVerified: (_a = identity.emailVerified) !== null && _a !== void 0 ? _a : false,
        ...identity.rawClaims,
        ...extra,
    };
}
export function createPrincipalFromIdentity(input) {
    return {
        issuer: input.issuer,
        subject: input.identity.providerUserId,
        email: input.identity.email,
        roles: resolvePrincipalRoles(input.identity.rawClaims),
        metadata: resolvePrincipalMetadata(input.identity, input.extraMetadata),
    };
}
