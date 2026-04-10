import { AlternunConfigError, AlternunProviderError } from '../../core/errors.js';
import { createAlternunSession, claimsToExternalIdentity, issuerSessionToUser, } from '../../core/session.js';
import { buildProvisioningEvent, externalIdentityToLinkedAccount, externalIdentityToPrincipal, principalToUserProjection, } from '../../identity/mapping.js';
import { clearOidcSession, readOidcSession } from '../../mobile/authentikClient.js';
import { getAuthentikEndpointBaseFromIssuer } from '../../mobile/authentikUrls.js';
import { resolveAuthentikClientId, resolveAuthentikIssuer, resolveAuthentikRedirectUri, } from '../../mobile/authentikUrls.js';
function resolveIssuer(options) {
    var _a;
    if ((_a = options.issuer) === null || _a === void 0 ? void 0 : _a.trim()) {
        return options.issuer.trim();
    }
    const browserOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const clientId = resolveAuthentikClientId(options.clientId);
    const resolvedIssuer = resolveAuthentikIssuer(undefined, browserOrigin, clientId);
    if (!resolvedIssuer) {
        throw new AlternunConfigError('Unable to resolve the Authentik issuer URL.');
    }
    return resolvedIssuer;
}
function resolveRedirectUri(options) {
    var _a;
    if ((_a = options.redirectUri) === null || _a === void 0 ? void 0 : _a.trim()) {
        return options.redirectUri.trim();
    }
    const browserOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const redirectUri = resolveAuthentikRedirectUri(undefined, browserOrigin);
    if (!redirectUri) {
        throw new AlternunConfigError('Unable to resolve the Authentik redirect URI.');
    }
    return redirectUri;
}
function toClaimsRecord(claims) {
    return { ...claims };
}
function normalizeOptionalTrimmedString(value) {
    const trimmed = value === null || value === void 0 ? void 0 : value.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
}
function normalizeBackendRoles(roles, fallback) {
    if (!Array.isArray(roles)) {
        return fallback;
    }
    const normalized = roles
        .map((role) => (typeof role === 'string' ? role.trim() : ''))
        .filter((role) => role.length > 0);
    return normalized.length > 0 ? normalized : fallback;
}
function normalizeBackendLinkedAccountType(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'email' || normalized === 'password') {
        return 'password';
    }
    if (normalized === 'wallet') {
        return 'wallet';
    }
    if (normalized === 'oidc' || normalized === 'authentik') {
        return 'oidc';
    }
    return 'social';
}
function normalizeBackendLinkedAccounts(linkedAccounts, fallbackIdentity) {
    if (!Array.isArray(linkedAccounts) || linkedAccounts.length === 0) {
        return [externalIdentityToLinkedAccount(fallbackIdentity, 'oidc')];
    }
    return linkedAccounts.map((account) => {
        var _a, _b, _c, _d, _e;
        return ({
            provider: typeof account.provider === 'string' && account.provider.trim().length > 0
                ? account.provider.trim()
                : fallbackIdentity.provider,
            providerUserId: typeof account.providerUserId === 'string' && account.providerUserId.trim().length > 0
                ? account.providerUserId.trim()
                : fallbackIdentity.providerUserId,
            type: normalizeBackendLinkedAccountType(account.type),
            email: typeof account.email === 'string' && account.email.trim().length > 0
                ? account.email.trim()
                : (_a = fallbackIdentity.email) !== null && _a !== void 0 ? _a : undefined,
            displayName: typeof account.displayName === 'string' && account.displayName.trim().length > 0
                ? account.displayName.trim()
                : (_b = fallbackIdentity.displayName) !== null && _b !== void 0 ? _b : undefined,
            avatarUrl: typeof account.avatarUrl === 'string' && account.avatarUrl.trim().length > 0
                ? account.avatarUrl.trim()
                : (_c = fallbackIdentity.avatarUrl) !== null && _c !== void 0 ? _c : undefined,
            metadata: {
                emailVerified: (_d = fallbackIdentity.emailVerified) !== null && _d !== void 0 ? _d : false,
                ...((_e = account.metadata) !== null && _e !== void 0 ? _e : {}),
            },
        });
    });
}
function normalizeBackendPrincipal(issuer, externalIdentity, principal, appUserId, fallbackMetadata = {}) {
    var _a;
    const basePrincipal = externalIdentityToPrincipal({
        issuer,
        identity: externalIdentity,
        extraMetadata: fallbackMetadata,
    });
    return {
        ...basePrincipal,
        issuer: typeof (principal === null || principal === void 0 ? void 0 : principal.issuer) === 'string' && principal.issuer.trim().length > 0
            ? principal.issuer.trim()
            : basePrincipal.issuer,
        subject: typeof (principal === null || principal === void 0 ? void 0 : principal.subject) === 'string' && principal.subject.trim().length > 0
            ? principal.subject.trim()
            : basePrincipal.subject,
        email: typeof (principal === null || principal === void 0 ? void 0 : principal.email) === 'string' && principal.email.trim().length > 0
            ? principal.email.trim()
            : basePrincipal.email,
        roles: normalizeBackendRoles(principal === null || principal === void 0 ? void 0 : principal.roles, basePrincipal.roles),
        metadata: {
            ...basePrincipal.metadata,
            ...((_a = principal === null || principal === void 0 ? void 0 : principal.metadata) !== null && _a !== void 0 ? _a : {}),
            appUserId,
        },
    };
}
function buildIssuerSessionFromOidc(session, issuer, principalId) {
    var _a, _b, _c, _d;
    const externalIdentity = claimsToExternalIdentity(session.provider, session.claims);
    const principal = externalIdentityToPrincipal({
        issuer,
        identity: externalIdentity,
    });
    return {
        issuer,
        accessToken: session.tokens.accessToken,
        refreshToken: (_a = session.tokens.refreshToken) !== null && _a !== void 0 ? _a : null,
        idToken: (_b = session.tokens.idToken) !== null && _b !== void 0 ? _b : null,
        expiresAt: (_c = session.tokens.expiresAt) !== null && _c !== void 0 ? _c : null,
        principal: {
            ...principal,
            subject: (_d = normalizeOptionalTrimmedString(principalId)) !== null && _d !== void 0 ? _d : principal.subject,
        },
        claims: toClaimsRecord(session.claims),
        linkedAccounts: [externalIdentityToLinkedAccount(externalIdentity, 'oidc')],
        raw: {
            oidcSession: session,
        },
    };
}
export class AuthentikIssuerProvider {
    constructor(options) {
        this.options = options;
        this.name = 'authentik';
        this.cachedSession = null;
        this.issuer = resolveIssuer(options);
        this.redirectUri = resolveRedirectUri(options);
        this.clientId = resolveAuthentikClientId(options.clientId);
        this.authExchangeUrl = normalizeOptionalTrimmedString(options.authExchangeUrl);
    }
    get fetchFn() {
        var _a;
        const fetchFn = (_a = this.options.fetchFn) !== null && _a !== void 0 ? _a : globalThis.fetch;
        if (!fetchFn) {
            throw new AlternunConfigError('Auth exchange URL is configured but fetch is unavailable in this runtime.');
        }
        return fetchFn;
    }
    buildBackendExchangeRequest(input) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const executionSession = input.executionSession;
        return {
            externalIdentity: input.externalIdentity,
            executionSession: executionSession
                ? {
                    provider: executionSession.provider,
                    accessToken: (_a = executionSession.accessToken) !== null && _a !== void 0 ? _a : null,
                    refreshToken: (_b = executionSession.refreshToken) !== null && _b !== void 0 ? _b : null,
                    idToken: (_c = executionSession.idToken) !== null && _c !== void 0 ? _c : null,
                    expiresAt: (_d = executionSession.expiresAt) !== null && _d !== void 0 ? _d : null,
                    linkedAccounts: (_e = executionSession.linkedAccounts) !== null && _e !== void 0 ? _e : [],
                }
                : undefined,
            context: {
                ...((_f = input.context) !== null && _f !== void 0 ? _f : {}),
                authExchangeUrl: this.authExchangeUrl,
            },
            claims: (_g = input.claims) !== null && _g !== void 0 ? _g : input.externalIdentity.rawClaims,
            redirectTo: (_h = input.redirectTo) !== null && _h !== void 0 ? _h : null,
        };
    }
    normalizeBackendExchangeResponse(response, input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const issuerAccessToken = (_a = response.issuerAccessToken) === null || _a === void 0 ? void 0 : _a.trim();
        if (!issuerAccessToken) {
            return null;
        }
        const issuer = (_c = normalizeOptionalTrimmedString((_b = response.principal) === null || _b === void 0 ? void 0 : _b.issuer)) !== null && _c !== void 0 ? _c : this.issuer;
        const linkedAccounts = normalizeBackendLinkedAccounts(response.linkedAccounts, input.externalIdentity);
        const principal = normalizeBackendPrincipal(issuer, input.externalIdentity, (_d = response.principal) !== null && _d !== void 0 ? _d : null, (_e = response.appUserId) !== null && _e !== void 0 ? _e : null, {
            backendExchange: true,
            exchangeMode: (_f = response.exchangeMode) !== null && _f !== void 0 ? _f : 'remote',
            syncStatus: (_g = response.syncStatus) !== null && _g !== void 0 ? _g : 'unknown',
        });
        const issuerSession = {
            issuer,
            accessToken: issuerAccessToken,
            refreshToken: (_h = response.issuerRefreshToken) !== null && _h !== void 0 ? _h : null,
            idToken: (_j = response.issuerIdToken) !== null && _j !== void 0 ? _j : null,
            expiresAt: (_k = response.issuerExpiresAt) !== null && _k !== void 0 ? _k : null,
            principal,
            claims: {
                ...((_l = response.claims) !== null && _l !== void 0 ? _l : input.externalIdentity.rawClaims),
                iss: issuer,
                sub: principal.subject,
                email: (_o = (_m = principal.email) !== null && _m !== void 0 ? _m : input.externalIdentity.email) !== null && _o !== void 0 ? _o : null,
                email_verified: Boolean(input.externalIdentity.emailVerified),
                roles: principal.roles,
                alternun_roles: principal.roles,
            },
            linkedAccounts,
            raw: {
                backendResponse: response,
                request: this.buildBackendExchangeRequest(input),
            },
        };
        this.cachedSession = issuerSession;
        return createAlternunSession({
            issuerSession,
            executionSession: (_p = input.executionSession) !== null && _p !== void 0 ? _p : null,
        });
    }
    async exchangeIdentityViaBackend(input) {
        if (!this.authExchangeUrl) {
            return null;
        }
        const response = await this.fetchFn(this.authExchangeUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(this.buildBackendExchangeRequest(input)),
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new AlternunProviderError(`Auth exchange request failed (${response.status} ${response.statusText}): ${text}`);
        }
        const json = (await response.json().catch(() => null));
        if (!json) {
            throw new AlternunProviderError('Auth exchange request returned an empty response body.');
        }
        return this.normalizeBackendExchangeResponse(json, input);
    }
    async exchangeIdentityLocally(input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
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
            eventType: 'issuer-exchange',
            aggregateType: 'principal',
            aggregateId: principalRecord.id,
            principal,
            externalIdentity,
            metadata: (_b = input.context) !== null && _b !== void 0 ? _b : {},
        }));
        const issuerSession = {
            issuer: this.issuer,
            accessToken: (_f = (_d = (_c = input.context) === null || _c === void 0 ? void 0 : _c.issuerAccessToken) !== null && _d !== void 0 ? _d : (_e = input.executionSession) === null || _e === void 0 ? void 0 : _e.accessToken) !== null && _f !== void 0 ? _f : '',
            refreshToken: (_k = (_h = (_g = input.context) === null || _g === void 0 ? void 0 : _g.issuerRefreshToken) !== null && _h !== void 0 ? _h : (_j = input.executionSession) === null || _j === void 0 ? void 0 : _j.refreshToken) !== null && _k !== void 0 ? _k : null,
            idToken: (_p = (_m = (_l = input.context) === null || _l === void 0 ? void 0 : _l.issuerIdToken) !== null && _m !== void 0 ? _m : (_o = input.executionSession) === null || _o === void 0 ? void 0 : _o.idToken) !== null && _p !== void 0 ? _p : null,
            expiresAt: (_t = (_r = (_q = input.context) === null || _q === void 0 ? void 0 : _q.issuerExpiresAt) !== null && _r !== void 0 ? _r : (_s = input.executionSession) === null || _s === void 0 ? void 0 : _s.expiresAt) !== null && _t !== void 0 ? _t : null,
            principal,
            claims: toClaimsRecord((_u = input.claims) !== null && _u !== void 0 ? _u : externalIdentity.rawClaims),
            linkedAccounts: [linkedAccount],
            raw: {
                executionSession: input.executionSession,
                context: (_v = input.context) !== null && _v !== void 0 ? _v : {},
            },
        };
        this.cachedSession = issuerSession;
        return createAlternunSession({
            issuerSession,
            executionSession: (_w = input.executionSession) !== null && _w !== void 0 ? _w : null,
        });
    }
    async exchangeIdentity(input) {
        const backendSession = await this.exchangeIdentityViaBackend(input).catch(() => null);
        if (backendSession) {
            return backendSession;
        }
        return this.exchangeIdentityLocally(input);
    }
    getIssuerSession() {
        if (this.cachedSession) {
            return Promise.resolve(this.cachedSession);
        }
        const session = readOidcSession({
            issuer: this.issuer,
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            sessionStorage: this.options.sessionStorage,
        });
        if (!session) {
            return Promise.resolve(null);
        }
        const issuerSession = buildIssuerSessionFromOidc(session, this.issuer, session.claims.sub);
        this.cachedSession = issuerSession;
        return Promise.resolve(issuerSession);
    }
    refreshIssuerSession() {
        this.cachedSession = null;
        return this.getIssuerSession();
    }
    logoutIssuerSession(options) {
        clearOidcSession({
            issuer: this.issuer,
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            sessionStorage: this.options.sessionStorage,
        });
        this.cachedSession = null;
        void options;
        return Promise.resolve();
    }
    discoverIssuerConfig() {
        const endpointBase = getAuthentikEndpointBaseFromIssuer(this.issuer);
        return Promise.resolve({
            issuer: this.issuer,
            authorizationEndpoint: `${endpointBase}authorize/`,
            tokenEndpoint: `${endpointBase}token/`,
            userinfoEndpoint: `${endpointBase}userinfo/`,
            endSessionEndpoint: `${this.issuer.replace(/\/$/, '')}/end-session/`,
            jwksUri: `${endpointBase}jwks/`,
            clientId: this.clientId,
        });
    }
    validateClaims(claims, options) {
        var _a, _b;
        const errors = [];
        const issuer = typeof claims.iss === 'string' ? claims.iss.trim() : '';
        const subject = typeof claims.sub === 'string' ? claims.sub.trim() : '';
        if (!issuer) {
            errors.push('Missing claim: iss');
        }
        if (!subject) {
            errors.push('Missing claim: sub');
        }
        const expectedIssuer = (_a = normalizeOptionalTrimmedString(options === null || options === void 0 ? void 0 : options.issuer)) !== null && _a !== void 0 ? _a : this.issuer;
        if (issuer && expectedIssuer && issuer !== expectedIssuer) {
            errors.push(`Unexpected issuer: ${issuer}`);
        }
        if (errors.length > 0) {
            return Promise.resolve({
                valid: false,
                principal: null,
                errors,
            });
        }
        const identity = claimsToExternalIdentity((_b = normalizeOptionalTrimmedString(issuer)) !== null && _b !== void 0 ? _b : this.issuer, claims);
        const principal = externalIdentityToPrincipal({
            issuer: expectedIssuer,
            identity,
        });
        void (options === null || options === void 0 ? void 0 : options.audience);
        return Promise.resolve({
            valid: true,
            principal,
            errors: [],
        });
    }
}
export function oidcSessionToExecutionSession(session) {
    var _a, _b, _c;
    return {
        provider: session.provider,
        accessToken: session.tokens.accessToken,
        refreshToken: (_a = session.tokens.refreshToken) !== null && _a !== void 0 ? _a : null,
        idToken: (_b = session.tokens.idToken) !== null && _b !== void 0 ? _b : null,
        expiresAt: (_c = session.tokens.expiresAt) !== null && _c !== void 0 ? _c : null,
        externalIdentity: claimsToExternalIdentity(session.provider, session.claims),
        linkedAccounts: [
            externalIdentityToLinkedAccount(claimsToExternalIdentity(session.provider, session.claims), 'oidc'),
        ],
        raw: {
            oidcSession: session,
        },
    };
}
export function issuerSessionToCompatUser(session) {
    return issuerSessionToUser(session);
}
