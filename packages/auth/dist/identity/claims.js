export function normalizeClaimString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
export function normalizeClaimBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    return undefined;
}
export function normalizeExternalIdentity(identity) {
    var _a;
    return {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        email: normalizeClaimString(identity.email),
        emailVerified: normalizeClaimBoolean(identity.emailVerified),
        displayName: normalizeClaimString(identity.displayName),
        avatarUrl: normalizeClaimString(identity.avatarUrl),
        rawClaims: (_a = identity.rawClaims) !== null && _a !== void 0 ? _a : {},
    };
}
export function claimsToRawIdentityClaims(claims) {
    return { ...claims };
}
export function claimsToExternalIdentity(provider, claims, providerUserId) {
    var _a, _b, _c, _d, _e;
    const rawClaims = claimsToRawIdentityClaims(claims);
    const subject = (_b = (_a = normalizeClaimString(rawClaims.sub)) !== null && _a !== void 0 ? _a : providerUserId) !== null && _b !== void 0 ? _b : provider;
    return normalizeExternalIdentity({
        provider,
        providerUserId: subject,
        email: normalizeClaimString(rawClaims.email),
        emailVerified: normalizeClaimBoolean(rawClaims.email_verified),
        displayName: (_e = (_d = (_c = normalizeClaimString(rawClaims.name)) !== null && _c !== void 0 ? _c : normalizeClaimString(rawClaims.preferred_username)) !== null && _d !== void 0 ? _d : normalizeClaimString(rawClaims.given_name)) !== null && _e !== void 0 ? _e : normalizeClaimString(rawClaims.family_name),
        avatarUrl: normalizeClaimString(rawClaims.picture),
        rawClaims,
    });
}
