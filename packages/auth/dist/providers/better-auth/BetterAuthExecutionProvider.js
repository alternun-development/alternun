import { AlternunConfigError, AlternunProviderError } from '../../core/errors.js';
import { claimsToExternalIdentity } from '../../identity/claims.js';
import { SupabaseExecutionProvider, } from '../supabase-legacy/SupabaseExecutionProvider.js';
function normalizeSession(input, fallbackProvider) {
    var _a;
    if (!input || typeof input !== 'object') {
        return null;
    }
    const raw = input;
    const identityCandidate = raw.externalIdentity && typeof raw.externalIdentity === 'object'
        ? raw.externalIdentity
        : raw.user && typeof raw.user === 'object'
            ? claimsToExternalIdentity(fallbackProvider, raw.user)
            : null;
    return {
        provider: typeof raw.provider === 'string'
            ? raw.provider
            : (_a = identityCandidate === null || identityCandidate === void 0 ? void 0 : identityCandidate.provider) !== null && _a !== void 0 ? _a : fallbackProvider,
        accessToken: typeof raw.accessToken === 'string' ? raw.accessToken : null,
        refreshToken: typeof raw.refreshToken === 'string' ? raw.refreshToken : null,
        idToken: typeof raw.idToken === 'string' ? raw.idToken : null,
        expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : null,
        externalIdentity: identityCandidate,
        linkedAccounts: Array.isArray(raw.linkedAccounts)
            ? raw.linkedAccounts
            : [],
        raw,
    };
}
async function callJson(fetchFn, baseUrl, path, body, apiKey) {
    const url = buildUrlWithBasePath(baseUrl, path);
    let response;
    try {
        response = await fetchFn(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify(body),
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
        throw new AlternunProviderError([
            `Better Auth request to ${url} failed before a response was received.`,
            'If this is a browser request, verify that the Better Auth service trusts the current app origin in BETTER_AUTH_TRUSTED_ORIGINS.',
            `Original error: ${message}`,
        ].join(' '));
    }
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new AlternunProviderError(`Better Auth request failed (${response.status} ${response.statusText}): ${text}`);
    }
    return response.json().catch(() => ({}));
}
function buildUrlWithBasePath(baseUrl, path) {
    const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
    const normalizedPath = path.trim().replace(/^\/+/, '');
    return new URL(normalizedPath, `${normalizedBaseUrl}/`).toString();
}
export class BetterAuthExecutionProvider {
    constructor(options) {
        var _a;
        this.options = options;
        this.name = 'better-auth';
        this.emailFallbackProvider = options.emailFallbackClient
            ? new SupabaseExecutionProvider(options.emailFallbackClient)
            : null;
        this.allowLegacySessionFallback = (_a = options.allowLegacySessionFallback) !== null && _a !== void 0 ? _a : false;
    }
    get client() {
        var _a;
        return (_a = this.options.client) !== null && _a !== void 0 ? _a : null;
    }
    get fetchFn() {
        var _a;
        return (_a = this.options.fetchFn) !== null && _a !== void 0 ? _a : fetch;
    }
    normalizeProvider(provider) {
        const trimmed = provider === null || provider === void 0 ? void 0 : provider.trim();
        return trimmed && trimmed.length > 0 ? trimmed : null;
    }
    async getFallbackExecutionSession() {
        if (!this.emailFallbackProvider) {
            return null;
        }
        try {
            return await this.emailFallbackProvider.getExecutionSession();
        }
        catch {
            return null;
        }
    }
    requireBaseUrl() {
        var _a;
        if ((_a = this.options.baseUrl) === null || _a === void 0 ? void 0 : _a.trim()) {
            return this.options.baseUrl.trim().replace(/\/$/, '');
        }
        throw new AlternunConfigError('Better Auth execution provider requires a baseUrl or a client implementation.');
    }
    async signIn(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const client = this.client;
        const provider = (_b = (_a = this.normalizeProvider(options.provider)) !== null && _a !== void 0 ? _a : this.normalizeProvider(this.options.defaultProvider)) !== null && _b !== void 0 ? _b : 'google';
        if (client === null || client === void 0 ? void 0 : client.signIn) {
            const result = await client.signIn({
                provider,
                flow: (_c = options.flow) !== null && _c !== void 0 ? _c : (provider === 'email' ? 'native' : 'redirect'),
                redirectUri: options.redirectUri,
                web3: options.web3,
                email: options.email,
                password: options.password,
                metadata: options.metadata,
            });
            const normalizedSession = normalizeSession(result, provider);
            return {
                session: normalizedSession,
                externalIdentity: (_d = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) !== null && _d !== void 0 ? _d : null,
                redirectUrl: (_e = options.redirectUri) !== null && _e !== void 0 ? _e : null,
            };
        }
        if (provider === 'email' && this.emailFallbackProvider) {
            return this.emailFallbackProvider.signIn(options);
        }
        const response = await callJson(this.fetchFn, this.requireBaseUrl(), (_f = this.options.signInPath) !== null && _f !== void 0 ? _f : '/auth/sign-in', {
            provider,
            flow: (_g = options.flow) !== null && _g !== void 0 ? _g : (provider === 'email' ? 'native' : 'redirect'),
            redirectUri: options.redirectUri,
            email: options.email,
            password: options.password,
            web3: options.web3,
            metadata: options.metadata,
        });
        const session = normalizeSession(response, provider);
        return {
            session,
            externalIdentity: (_h = session === null || session === void 0 ? void 0 : session.externalIdentity) !== null && _h !== void 0 ? _h : null,
            redirectUrl: typeof (response === null || response === void 0 ? void 0 : response.redirectUrl) === 'string'
                ? response.redirectUrl
                : (_j = options.redirectUri) !== null && _j !== void 0 ? _j : null,
            needsEmailVerification: typeof (response === null || response === void 0 ? void 0 : response.needsEmailVerification) === 'boolean'
                ? response.needsEmailVerification
                : undefined,
            emailAlreadyRegistered: typeof (response === null || response === void 0 ? void 0 : response.emailAlreadyRegistered) === 'boolean'
                ? response.emailAlreadyRegistered
                : undefined,
            confirmationEmailSent: typeof (response === null || response === void 0 ? void 0 : response.confirmationEmailSent) === 'boolean'
                ? response.confirmationEmailSent
                : undefined,
        };
    }
    async signUp(input) {
        var _a, _b, _c;
        const client = this.client;
        if (client === null || client === void 0 ? void 0 : client.signUp) {
            const result = await client.signUp(input);
            const normalizedSession = normalizeSession(result, 'email');
            return {
                session: normalizedSession,
                externalIdentity: (_a = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) !== null && _a !== void 0 ? _a : null,
                needsEmailVerification: typeof (result === null || result === void 0 ? void 0 : result.needsEmailVerification) === 'boolean'
                    ? result.needsEmailVerification
                    : undefined,
                emailAlreadyRegistered: typeof (result === null || result === void 0 ? void 0 : result.emailAlreadyRegistered) === 'boolean'
                    ? result.emailAlreadyRegistered
                    : undefined,
                confirmationEmailSent: typeof (result === null || result === void 0 ? void 0 : result.confirmationEmailSent) === 'boolean'
                    ? result.confirmationEmailSent
                    : undefined,
            };
        }
        if (this.emailFallbackProvider) {
            return this.emailFallbackProvider.signUp(input);
        }
        const response = await callJson(this.fetchFn, this.requireBaseUrl(), (_b = this.options.signUpPath) !== null && _b !== void 0 ? _b : '/auth/sign-up', {
            email: input.email,
            password: input.password,
            locale: input.locale,
            metadata: input.metadata,
        });
        const session = normalizeSession(response, 'email');
        return {
            session,
            externalIdentity: (_c = session === null || session === void 0 ? void 0 : session.externalIdentity) !== null && _c !== void 0 ? _c : null,
            needsEmailVerification: typeof (response === null || response === void 0 ? void 0 : response.needsEmailVerification) === 'boolean'
                ? response.needsEmailVerification
                : undefined,
            emailAlreadyRegistered: typeof (response === null || response === void 0 ? void 0 : response.emailAlreadyRegistered) === 'boolean'
                ? response.emailAlreadyRegistered
                : undefined,
            confirmationEmailSent: typeof (response === null || response === void 0 ? void 0 : response.confirmationEmailSent) === 'boolean'
                ? response.confirmationEmailSent
                : undefined,
        };
    }
    async signOut() {
        var _a, _b, _c;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.signOut) {
            await this.client.signOut();
        }
        if (this.emailFallbackProvider) {
            await this.emailFallbackProvider.signOut().catch(() => undefined);
        }
        const baseUrl = (_b = this.options.baseUrl) === null || _b === void 0 ? void 0 : _b.trim();
        if (!baseUrl) {
            return;
        }
        await callJson(this.fetchFn, this.requireBaseUrl(), (_c = this.options.signOutPath) !== null && _c !== void 0 ? _c : '/auth/sign-out', {});
    }
    async getExecutionSession() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.getSession) {
            const session = await this.client.getSession();
            const normalized = normalizeSession(session, (_b = this.options.defaultProvider) !== null && _b !== void 0 ? _b : 'better-auth');
            if (normalized) {
                return normalized;
            }
        }
        if (((_c = this.client) === null || _c === void 0 ? void 0 : _c.getUser) && this.client.getSessionToken) {
            const user = await this.client.getUser();
            const token = await this.client.getSessionToken();
            if (user) {
                return {
                    provider: (_e = (_d = user.provider) !== null && _d !== void 0 ? _d : this.options.defaultProvider) !== null && _e !== void 0 ? _e : 'better-auth',
                    accessToken: token !== null && token !== void 0 ? token : null,
                    refreshToken: null,
                    idToken: null,
                    expiresAt: null,
                    externalIdentity: claimsToExternalIdentity((_g = (_f = user.provider) !== null && _f !== void 0 ? _f : this.options.defaultProvider) !== null && _g !== void 0 ? _g : 'better-auth', (_h = user.metadata) !== null && _h !== void 0 ? _h : {}, (_j = user.providerUserId) !== null && _j !== void 0 ? _j : user.id),
                    linkedAccounts: [],
                    raw: { user },
                };
            }
        }
        if (this.allowLegacySessionFallback) {
            const fallbackSession = await this.getFallbackExecutionSession();
            if (fallbackSession) {
                return fallbackSession;
            }
        }
        if (!this.options.baseUrl) {
            return null;
        }
        const response = await callJson(this.fetchFn, this.requireBaseUrl(), (_k = this.options.sessionPath) !== null && _k !== void 0 ? _k : '/auth/session', {});
        return normalizeSession(response, (_l = this.options.defaultProvider) !== null && _l !== void 0 ? _l : 'better-auth');
    }
    async refreshExecutionSession() {
        var _a, _b, _c, _d;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.refreshSession) {
            const session = await this.client.refreshSession();
            return normalizeSession(session, (_b = this.options.defaultProvider) !== null && _b !== void 0 ? _b : 'better-auth');
        }
        if (this.allowLegacySessionFallback) {
            const fallbackSession = await this.getFallbackExecutionSession();
            if (fallbackSession) {
                return fallbackSession;
            }
        }
        if (!this.options.baseUrl) {
            return this.getExecutionSession();
        }
        const response = await callJson(this.fetchFn, this.requireBaseUrl(), (_c = this.options.refreshPath) !== null && _c !== void 0 ? _c : '/auth/session/refresh', {});
        return normalizeSession(response, (_d = this.options.defaultProvider) !== null && _d !== void 0 ? _d : 'better-auth');
    }
    async linkProvider(input) {
        var _a, _b, _c, _d;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.linkProvider) {
            await this.client.linkProvider(input);
        }
        else if (this.options.baseUrl) {
            await callJson(this.fetchFn, this.requireBaseUrl(), (_b = this.options.linkPath) !== null && _b !== void 0 ? _b : '/auth/link', {
                provider: input.provider,
                providerUserId: input.providerUserId,
                type: input.type,
                email: input.email,
                metadata: (_c = input.metadata) !== null && _c !== void 0 ? _c : {},
            });
        }
        else {
            return null;
        }
        return {
            provider: input.provider,
            providerUserId: input.providerUserId,
            type: input.type,
            email: input.email,
            metadata: (_d = input.metadata) !== null && _d !== void 0 ? _d : {},
        };
    }
    async unlinkProvider(input) {
        var _a, _b;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.unlinkProvider) {
            await this.client.unlinkProvider(input);
            return;
        }
        if (!this.options.baseUrl) {
            return;
        }
        await callJson(this.fetchFn, this.requireBaseUrl(), (_b = this.options.unlinkPath) !== null && _b !== void 0 ? _b : '/auth/unlink', {
            provider: input.provider,
            providerUserId: input.providerUserId,
            type: input.type,
        });
    }
    async signInWithEmail(email, password) {
        var _a;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.signIn) {
            const result = await this.signIn({
                provider: 'email',
                flow: 'native',
                email,
                password,
            });
            if (result.externalIdentity) {
                return {
                    id: result.externalIdentity.providerUserId,
                    email: result.externalIdentity.email,
                    avatarUrl: result.externalIdentity.avatarUrl,
                    provider: result.externalIdentity.provider,
                    providerUserId: result.externalIdentity.providerUserId,
                    metadata: result.externalIdentity.rawClaims,
                };
            }
            throw new AlternunProviderError('Better Auth email sign-in did not return a user session.');
        }
        if (this.emailFallbackProvider) {
            return this.emailFallbackProvider.signInWithEmail(email, password);
        }
        const result = await this.signIn({
            provider: 'email',
            flow: 'native',
            email,
            password,
        });
        if (result.externalIdentity) {
            return {
                id: result.externalIdentity.providerUserId,
                email: result.externalIdentity.email,
                avatarUrl: result.externalIdentity.avatarUrl,
                provider: result.externalIdentity.provider,
                providerUserId: result.externalIdentity.providerUserId,
                metadata: result.externalIdentity.rawClaims,
            };
        }
        throw new AlternunProviderError('Better Auth email sign-in did not return a user session.');
    }
    async signUpWithEmail(email, password, locale) {
        return this.signUp({ email, password, locale });
    }
    async resendEmailConfirmation(email) {
        if (this.emailFallbackProvider) {
            await this.emailFallbackProvider.resendEmailConfirmation(email);
            return;
        }
        await this.signIn({
            provider: 'email',
            flow: 'native',
            email,
        });
    }
    async verifyEmailConfirmationCode(email, code) {
        if (this.emailFallbackProvider) {
            await this.emailFallbackProvider.verifyEmailConfirmationCode(email, code);
            return;
        }
        return Promise.resolve();
    }
    async signInWithGoogle(redirectTo) {
        await this.signIn({
            provider: 'google',
            flow: 'redirect',
            redirectUri: redirectTo,
        });
    }
    capabilities() {
        return {
            runtime: 'web',
            supportedFlows: ['redirect', 'native'],
        };
    }
    async getUser() {
        const session = await this.getExecutionSession();
        const identity = session === null || session === void 0 ? void 0 : session.externalIdentity;
        if (!identity) {
            return null;
        }
        return {
            id: identity.providerUserId,
            email: identity.email,
            avatarUrl: identity.avatarUrl,
            provider: identity.provider,
            providerUserId: identity.providerUserId,
            metadata: identity.rawClaims,
        };
    }
    async getSessionToken() {
        var _a;
        const session = await this.getExecutionSession();
        return (_a = session === null || session === void 0 ? void 0 : session.accessToken) !== null && _a !== void 0 ? _a : null;
    }
    onAuthStateChange(callback) {
        void this.getUser()
            .then(callback)
            .catch(() => callback(null));
        return () => undefined;
    }
}
