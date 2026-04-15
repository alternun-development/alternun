import { AlternunConfigError } from '../../core/errors.js';
import { createAlternunSession, claimsToExternalIdentity } from '../../core/session.js';
import { buildProvisioningEvent, externalIdentityToLinkedAccount, externalIdentityToPrincipal, principalToUserProjection, } from '../../identity/mapping.js';
import { getAuthentikEndpointBaseFromIssuer, resolveAuthentikClientId, resolveAuthentikIssuer, } from '../../mobile/authentikUrls.js';
function resolveIssuer(options) {
    var _a;
    if ((_a = options.issuer) === null || _a === void 0 ? void 0 : _a.trim()) {
        return options.issuer.trim();
    }
    const browserOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const clientId = resolveAuthentikClientId(options.clientId);
    const resolvedIssuer = resolveAuthentikIssuer(undefined, browserOrigin, clientId);
    if (!resolvedIssuer) {
        throw new AlternunConfigError('Unable to resolve the legacy issuer URL.');
    }
    return resolvedIssuer;
}
function toClaimsRecord(claims) {
    return { ...claims };
}
export class SupabaseLegacyIssuerProvider {
    constructor(options) {
        this.options = options;
        this.name = 'supabase-legacy';
        this.cachedSession = null;
        this.issuer = resolveIssuer(options);
    }
    async exchangeIdentity(input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const externalIdentity = input.externalIdentity;
        const principal = externalIdentityToPrincipal({
            issuer: this.issuer,
            identity: externalIdentity,
            extraMetadata: (_a = input.context) !== null && _a !== void 0 ? _a : {},
        });
        const principalRecord = await this.options.identityRepository.upsertPrincipal({
            principal,
            externalIdentity,
            source: this.name,
        });
        const userProjection = principalToUserProjection({
            principal,
            externalIdentity,
            appUserId: principalRecord.id,
        });
        await this.options.identityRepository.upsertUserProjection(userProjection);
        const linkedAccount = externalIdentityToLinkedAccount(externalIdentity, 'oidc');
        await this.options.identityRepository.upsertLinkedAccount({
            principalId: principalRecord.id,
            principal,
            linkedAccount,
        });
        await this.options.identityRepository.recordProvisioningEvent(buildProvisioningEvent({
            eventType: 'legacy-issuer-exchange',
            aggregateType: 'principal',
            aggregateId: principalRecord.id,
            principal,
            externalIdentity,
            metadata: (_b = input.context) !== null && _b !== void 0 ? _b : {},
        }));
        const issuerSession = {
            issuer: this.issuer,
            accessToken: (_d = (_c = input.executionSession) === null || _c === void 0 ? void 0 : _c.accessToken) !== null && _d !== void 0 ? _d : '',
            refreshToken: (_f = (_e = input.executionSession) === null || _e === void 0 ? void 0 : _e.refreshToken) !== null && _f !== void 0 ? _f : null,
            idToken: (_h = (_g = input.executionSession) === null || _g === void 0 ? void 0 : _g.idToken) !== null && _h !== void 0 ? _h : null,
            expiresAt: (_k = (_j = input.executionSession) === null || _j === void 0 ? void 0 : _j.expiresAt) !== null && _k !== void 0 ? _k : null,
            principal,
            claims: toClaimsRecord(externalIdentity.rawClaims),
            linkedAccounts: [linkedAccount],
            raw: {
                executionSession: input.executionSession,
                context: (_l = input.context) !== null && _l !== void 0 ? _l : {},
            },
        };
        this.cachedSession = issuerSession;
        return createAlternunSession({
            issuerSession,
            executionSession: (_m = input.executionSession) !== null && _m !== void 0 ? _m : null,
        });
    }
    getIssuerSession() {
        return Promise.resolve(this.cachedSession);
    }
    refreshIssuerSession() {
        return Promise.resolve(this.cachedSession);
    }
    logoutIssuerSession() {
        this.cachedSession = null;
        return Promise.resolve();
    }
    discoverIssuerConfig() {
        const endpointBase = getAuthentikEndpointBaseFromIssuer(this.issuer);
        const clientId = resolveAuthentikClientId(this.options.clientId);
        return Promise.resolve({
            issuer: this.issuer,
            authorizationEndpoint: `${endpointBase}authorize/`,
            tokenEndpoint: `${endpointBase}token/`,
            userinfoEndpoint: `${endpointBase}userinfo/`,
            endSessionEndpoint: `${this.issuer.replace(/\/$/, '')}/end-session/`,
            jwksUri: `${endpointBase}jwks/`,
            clientId,
        });
    }
    validateClaims(claims) {
        const errors = [];
        if (typeof claims.sub !== 'string' || claims.sub.trim().length === 0) {
            errors.push('Missing claim: sub');
        }
        if (typeof claims.iss !== 'string' || claims.iss.trim().length === 0) {
            errors.push('Missing claim: iss');
        }
        if (errors.length > 0) {
            return Promise.resolve({
                valid: false,
                principal: null,
                errors,
            });
        }
        const identity = claimsToExternalIdentity(typeof claims.iss === 'string' ? claims.iss : this.issuer, claims);
        const principal = externalIdentityToPrincipal({
            issuer: this.issuer,
            identity,
        });
        return Promise.resolve({
            valid: true,
            principal,
            errors: [],
        });
    }
}
