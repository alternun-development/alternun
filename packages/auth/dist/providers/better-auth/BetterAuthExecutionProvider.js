import { AlternunConfigError, AlternunProviderError } from '../../core/errors.js';
import { claimsToExternalIdentity } from '../../identity/claims.js';
import { SupabaseExecutionProvider, } from '../supabase-legacy/SupabaseExecutionProvider.js';
function normalizeSession(input, fallbackProvider) {
    var _a, _b, _c, _d;
    if (!input || typeof input !== 'object') {
        return null;
    }
    const raw = input;
    const payload = isRecord(raw.data) ? raw.data : raw;
    const sessionPayload = isRecord(payload.session) ? payload.session : null;
    const userPayload = isRecord(payload.user) ? payload.user : null;
    const externalIdentityPayload = isRecord(payload.externalIdentity) && payload.externalIdentity
        ? payload.externalIdentity
        : userPayload
            ? claimsToExternalIdentity(fallbackProvider, {
                ...userPayload,
                sub: typeof userPayload.sub === 'string' && userPayload.sub.trim().length > 0
                    ? userPayload.sub
                    : typeof userPayload.id === 'string' && userPayload.id.trim().length > 0
                        ? userPayload.id
                        : typeof (sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.userId) === 'string' &&
                            sessionPayload.userId.trim().length > 0
                            ? sessionPayload.userId
                            : undefined,
                email: typeof userPayload.email === 'string' && userPayload.email.trim().length > 0
                    ? userPayload.email
                    : undefined,
                email_verified: typeof userPayload.email_verified === 'boolean'
                    ? userPayload.email_verified
                    : typeof userPayload.emailVerified === 'boolean'
                        ? userPayload.emailVerified
                        : undefined,
                name: typeof userPayload.name === 'string' && userPayload.name.trim().length > 0
                    ? userPayload.name
                    : typeof userPayload.displayName === 'string' &&
                        userPayload.displayName.trim().length > 0
                        ? userPayload.displayName
                        : undefined,
                picture: typeof userPayload.picture === 'string' && userPayload.picture.trim().length > 0
                    ? userPayload.picture
                    : typeof userPayload.image === 'string' && userPayload.image.trim().length > 0
                        ? userPayload.image
                        : typeof userPayload.avatarUrl === 'string' &&
                            userPayload.avatarUrl.trim().length > 0
                            ? userPayload.avatarUrl
                            : undefined,
            }, typeof userPayload.sub === 'string' && userPayload.sub.trim().length > 0
                ? userPayload.sub
                : typeof userPayload.id === 'string' && userPayload.id.trim().length > 0
                    ? userPayload.id
                    : typeof (sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.userId) === 'string' && sessionPayload.userId.trim().length > 0
                        ? sessionPayload.userId
                        : undefined)
            : null;
    const identityCandidate = externalIdentityPayload;
    const accessTokenCandidate = typeof payload.token === 'string'
        ? payload.token
        : typeof payload.accessToken === 'string'
            ? payload.accessToken
            : typeof (sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.token) === 'string'
                ? sessionPayload.token
                : typeof (sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.id) === 'string'
                    ? sessionPayload.id
                    : typeof (sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.sessionToken) === 'string'
                        ? sessionPayload.sessionToken
                        : null;
    const refreshTokenCandidate = typeof payload.refreshToken === 'string'
        ? payload.refreshToken
        : typeof (sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.refreshToken) === 'string'
            ? sessionPayload.refreshToken
            : null;
    const idTokenCandidate = typeof payload.idToken === 'string'
        ? payload.idToken
        : typeof (sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.idToken) === 'string'
            ? sessionPayload.idToken
            : null;
    const expiresAtCandidate = (_c = (_b = (_a = normalizeMaybeDate(payload.expiresAt)) !== null && _a !== void 0 ? _a : normalizeMaybeDate(sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.expiresAt)) !== null && _b !== void 0 ? _b : normalizeMaybeDate(sessionPayload === null || sessionPayload === void 0 ? void 0 : sessionPayload.expires_at)) !== null && _c !== void 0 ? _c : null;
    return {
        provider: typeof payload.provider === 'string'
            ? payload.provider
            : (_d = identityCandidate === null || identityCandidate === void 0 ? void 0 : identityCandidate.provider) !== null && _d !== void 0 ? _d : fallbackProvider,
        accessToken: accessTokenCandidate,
        refreshToken: refreshTokenCandidate,
        idToken: idTokenCandidate,
        expiresAt: expiresAtCandidate,
        externalIdentity: identityCandidate,
        linkedAccounts: Array.isArray(payload.linkedAccounts)
            ? payload.linkedAccounts
            : [],
        raw,
    };
}
function extractRedirectTarget(input) {
    if (!input || typeof input !== 'object') {
        return null;
    }
    const raw = input;
    const payload = isRecord(raw.data) ? raw.data : raw;
    const redirectUrlCandidate = typeof payload.redirectUrl === 'string'
        ? payload.redirectUrl
        : typeof payload.redirectURL === 'string'
            ? payload.redirectURL
            : typeof payload.url === 'string'
                ? payload.url
                : typeof payload.location === 'string'
                    ? payload.location
                    : null;
    const trimmed = redirectUrlCandidate === null || redirectUrlCandidate === void 0 ? void 0 : redirectUrlCandidate.trim();
    return trimmed ? trimmed : null;
}
function isRecord(value) {
    return Boolean(value && typeof value === 'object');
}
function isVerifiedEmailSignup(result) {
    if (!isRecord(result)) {
        return false;
    }
    const user = result.user;
    if (!isRecord(user)) {
        return false;
    }
    return user.emailVerified === true;
}
function isEmailVerificationPendingResult(result) {
    var _a;
    return (result.needsEmailVerification === true ||
        result.confirmationEmailSent === true ||
        ((_a = result.externalIdentity) === null || _a === void 0 ? void 0 : _a.emailVerified) === false);
}
function normalizeMaybeDate(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 1e12 ? value : value * 1000;
    }
    if (value instanceof Date) {
        return value.getTime();
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}
function deriveSignUpName(email, providedName) {
    var _a;
    const trimmedName = providedName === null || providedName === void 0 ? void 0 : providedName.trim();
    if (trimmedName) {
        return trimmedName;
    }
    const localPart = (_a = email.split('@')[0]) === null || _a === void 0 ? void 0 : _a.trim();
    if (localPart) {
        return localPart;
    }
    return email.trim();
}
async function callJson(fetchFn, baseUrl, path, body, apiKey) {
    const url = buildUrlWithBasePath(baseUrl, path);
    let response;
    try {
        response = await fetchFn(url, {
            method: 'POST',
            credentials: 'include',
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
    const normalizedPath = path.trim();
    return new URL(normalizedPath, `${normalizedBaseUrl}/`).toString();
}
function resolveBrowserClientBaseUrl(baseUrl) {
    const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
    try {
        const url = new URL(trimmedBaseUrl);
        if (url.pathname && url.pathname !== '/') {
            return trimmedBaseUrl;
        }
        return `${trimmedBaseUrl}/auth`;
    }
    catch {
        return `${trimmedBaseUrl}/auth`;
    }
}
export class BetterAuthExecutionProvider {
    constructor(options) {
        var _a;
        this.options = options;
        this.name = 'better-auth';
        this.browserClientPromise = null;
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
    get supabase() {
        var _a, _b;
        return (_b = (_a = this.emailFallbackProvider) === null || _a === void 0 ? void 0 : _a.supabase) !== null && _b !== void 0 ? _b : null;
    }
    async resolveBrowserClient() {
        var _a;
        if (this.options.browserClient) {
            return this.options.browserClient;
        }
        if (this.options.browserClientFactory) {
            const created = await this.options.browserClientFactory();
            if (created) {
                this.options.browserClient = created;
            }
            return created;
        }
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return null;
        }
        if (!((_a = this.options.baseUrl) === null || _a === void 0 ? void 0 : _a.trim())) {
            return null;
        }
        if (!this.browserClientPromise) {
            this.browserClientPromise = import('better-auth/client')
                .then(({ createAuthClient }) => createAuthClient({
                baseURL: resolveBrowserClientBaseUrl(this.requireBaseUrl()),
                fetchOptions: {
                    credentials: 'include',
                },
            }))
                .catch(() => null);
        }
        return this.browserClientPromise;
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        const client = this.client;
        const provider = (_b = (_a = this.normalizeProvider(options.provider)) !== null && _a !== void 0 ? _a : this.normalizeProvider(this.options.defaultProvider)) !== null && _b !== void 0 ? _b : 'google';
        if (provider === 'email' && this.emailFallbackProvider) {
            return this.emailFallbackProvider.signIn({
                provider: 'email',
                flow: (_c = options.flow) !== null && _c !== void 0 ? _c : 'native',
                redirectUri: options.redirectUri,
                web3: options.web3,
                email: options.email,
                password: options.password,
                metadata: options.metadata,
            });
        }
        const browserClient = await this.resolveBrowserClient();
        if (client === null || client === void 0 ? void 0 : client.signIn) {
            const result = await client.signIn({
                provider,
                flow: (_d = options.flow) !== null && _d !== void 0 ? _d : (provider === 'email' ? 'native' : 'redirect'),
                redirectUri: options.redirectUri,
                web3: options.web3,
                email: options.email,
                password: options.password,
                metadata: options.metadata,
            });
            if (result === null || result === void 0 ? void 0 : result.error) {
                const errorPayload = result.error;
                throw new AlternunProviderError(typeof errorPayload.message === 'string' ? errorPayload.message : 'Sign in failed');
            }
            const redirectUrl = extractRedirectTarget(result);
            const normalizedSession = provider !== 'email' && redirectUrl ? null : normalizeSession(result, provider);
            const needsEmailVerification = provider === 'email'
                ? typeof (result === null || result === void 0 ? void 0 : result.needsEmailVerification) === 'boolean'
                    ? result.needsEmailVerification
                    : ((_e = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) === null || _e === void 0 ? void 0 : _e.emailVerified) === false
                : undefined;
            const confirmationEmailSent = provider === 'email'
                ? typeof (result === null || result === void 0 ? void 0 : result.confirmationEmailSent) === 'boolean'
                    ? result.confirmationEmailSent
                    : ((_f = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) === null || _f === void 0 ? void 0 : _f.emailVerified) === false
                : undefined;
            const emailAlreadyRegistered = provider === 'email'
                ? typeof (result === null || result === void 0 ? void 0 : result.emailAlreadyRegistered) === 'boolean'
                    ? result.emailAlreadyRegistered
                    : undefined
                : undefined;
            return {
                session: normalizedSession,
                externalIdentity: (_g = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) !== null && _g !== void 0 ? _g : null,
                redirectUrl,
                ...(provider === 'email'
                    ? {
                        needsEmailVerification,
                        confirmationEmailSent,
                        ...(typeof emailAlreadyRegistered === 'boolean' ? { emailAlreadyRegistered } : {}),
                    }
                    : {}),
            };
        }
        if (browserClient === null || browserClient === void 0 ? void 0 : browserClient.signIn) {
            if (provider === 'email' && browserClient.signIn.email && options.password) {
                const result = await browserClient.signIn.email({
                    email: (_h = options.email) !== null && _h !== void 0 ? _h : '',
                    password: options.password,
                    callbackURL: options.redirectUri,
                    errorCallbackURL: options.redirectUri,
                    newUserCallbackURL: options.redirectUri,
                });
                if (result === null || result === void 0 ? void 0 : result.error) {
                    const errorPayload = result.error;
                    throw new AlternunProviderError(typeof errorPayload.message === 'string' ? errorPayload.message : 'Email sign in failed');
                }
                const normalizedSession = normalizeSession(result, 'email');
                const needsEmailVerification = typeof (result === null || result === void 0 ? void 0 : result.needsEmailVerification) === 'boolean'
                    ? result.needsEmailVerification
                    : ((_j = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) === null || _j === void 0 ? void 0 : _j.emailVerified) === false;
                const confirmationEmailSent = typeof (result === null || result === void 0 ? void 0 : result.confirmationEmailSent) === 'boolean'
                    ? result.confirmationEmailSent
                    : ((_k = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) === null || _k === void 0 ? void 0 : _k.emailVerified) === false;
                const emailAlreadyRegistered = typeof (result === null || result === void 0 ? void 0 : result.emailAlreadyRegistered) === 'boolean'
                    ? result.emailAlreadyRegistered
                    : undefined;
                return {
                    session: normalizedSession,
                    externalIdentity: (_l = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) !== null && _l !== void 0 ? _l : null,
                    redirectUrl: extractRedirectTarget(result),
                    needsEmailVerification,
                    confirmationEmailSent,
                    ...(typeof emailAlreadyRegistered === 'boolean' ? { emailAlreadyRegistered } : {}),
                };
            }
            if (browserClient.signIn.social) {
                const result = await browserClient.signIn.social({
                    provider,
                    callbackURL: options.redirectUri,
                    errorCallbackURL: options.redirectUri,
                    newUserCallbackURL: options.redirectUri,
                    disableRedirect: false,
                });
                if (result === null || result === void 0 ? void 0 : result.error) {
                    const errorPayload = result.error;
                    throw new AlternunProviderError(typeof errorPayload.message === 'string'
                        ? errorPayload.message
                        : 'Social sign in failed');
                }
                const redirectUrl = extractRedirectTarget(result);
                const normalizedSession = redirectUrl ? null : normalizeSession(result, provider);
                return {
                    session: normalizedSession,
                    externalIdentity: (_m = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) !== null && _m !== void 0 ? _m : null,
                    redirectUrl,
                };
            }
        }
        const isEmailProvider = provider === 'email';
        const response = await callJson(this.fetchFn, this.requireBaseUrl(), isEmailProvider
            ? (_p = (_o = this.options.signInEmailPath) !== null && _o !== void 0 ? _o : this.options.signInPath) !== null && _p !== void 0 ? _p : '/auth/sign-in/email'
            : (_r = (_q = this.options.signInSocialPath) !== null && _q !== void 0 ? _q : this.options.signInPath) !== null && _r !== void 0 ? _r : '/auth/sign-in/social', {
            provider,
            flow: (_s = options.flow) !== null && _s !== void 0 ? _s : (provider === 'email' ? 'native' : 'redirect'),
            callbackURL: options.redirectUri,
            errorCallbackURL: options.redirectUri,
            newUserCallbackURL: options.redirectUri,
            email: options.email,
            password: options.password,
            web3: options.web3,
            metadata: options.metadata,
        });
        const redirectUrl = extractRedirectTarget(response);
        const session = redirectUrl && provider !== 'email' ? null : normalizeSession(response, provider);
        const needsEmailVerification = provider === 'email'
            ? typeof (response === null || response === void 0 ? void 0 : response.needsEmailVerification) === 'boolean'
                ? response.needsEmailVerification
                : ((_t = session === null || session === void 0 ? void 0 : session.externalIdentity) === null || _t === void 0 ? void 0 : _t.emailVerified) === false
            : undefined;
        const confirmationEmailSent = provider === 'email'
            ? typeof (response === null || response === void 0 ? void 0 : response.confirmationEmailSent) === 'boolean'
                ? response.confirmationEmailSent
                : ((_u = session === null || session === void 0 ? void 0 : session.externalIdentity) === null || _u === void 0 ? void 0 : _u.emailVerified) === false
            : undefined;
        const emailAlreadyRegistered = provider === 'email'
            ? typeof (response === null || response === void 0 ? void 0 : response.emailAlreadyRegistered) === 'boolean'
                ? response.emailAlreadyRegistered
                : undefined
            : undefined;
        return {
            session,
            externalIdentity: (_v = session === null || session === void 0 ? void 0 : session.externalIdentity) !== null && _v !== void 0 ? _v : null,
            redirectUrl,
            ...(provider === 'email'
                ? {
                    needsEmailVerification,
                    confirmationEmailSent,
                    ...(typeof emailAlreadyRegistered === 'boolean' ? { emailAlreadyRegistered } : {}),
                }
                : {}),
        };
    }
    async signUp(input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        if (this.emailFallbackProvider) {
            return (await this.emailFallbackProvider.signUpWithEmail(input.email, input.password, input.locale, (_a = input.referral) !== null && _a !== void 0 ? _a : null));
        }
        const client = this.client;
        const signUpName = deriveSignUpName(input.email, input.name);
        if (client === null || client === void 0 ? void 0 : client.signUp) {
            const result = await client.signUp({
                ...input,
                name: signUpName,
            });
            if (result === null || result === void 0 ? void 0 : result.error) {
                const errorPayload = result.error;
                throw new AlternunProviderError(typeof errorPayload.message === 'string' ? errorPayload.message : 'Sign up failed');
            }
            const normalizedSession = normalizeSession(result, 'email');
            const verifiedEmailSignup = isVerifiedEmailSignup(result);
            const accessToken = (_b = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.accessToken) !== null && _b !== void 0 ? _b : null;
            const needsEmailVerification = typeof (result === null || result === void 0 ? void 0 : result.needsEmailVerification) === 'boolean'
                ? result.needsEmailVerification
                : !verifiedEmailSignup || !accessToken;
            const confirmationEmailSent = typeof (result === null || result === void 0 ? void 0 : result.confirmationEmailSent) === 'boolean'
                ? result.confirmationEmailSent
                : !verifiedEmailSignup || !accessToken;
            return {
                session: verifiedEmailSignup ? normalizedSession : null,
                externalIdentity: (_c = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) !== null && _c !== void 0 ? _c : null,
                needsEmailVerification,
                emailAlreadyRegistered: false,
                confirmationEmailSent,
            };
        }
        const browserClient = await this.resolveBrowserClient();
        if ((_d = browserClient === null || browserClient === void 0 ? void 0 : browserClient.signUp) === null || _d === void 0 ? void 0 : _d.email) {
            const signUpOptions = {
                email: input.email,
                password: input.password,
                name: signUpName,
                callbackURL: undefined,
                locale: input.locale,
                metadata: input.metadata,
                ...(((_e = input.referral) === null || _e === void 0 ? void 0 : _e.referralCode) ? { referral_code: input.referral.referralCode } : {}),
                ...(((_f = input.referral) === null || _f === void 0 ? void 0 : _f.referredByUsername)
                    ? { referred_by_username: input.referral.referredByUsername }
                    : {}),
                ...(((_g = input.referral) === null || _g === void 0 ? void 0 : _g.referredByEmail)
                    ? { referred_by_email: input.referral.referredByEmail }
                    : {}),
            };
            const result = await browserClient.signUp.email(signUpOptions);
            if (result === null || result === void 0 ? void 0 : result.error) {
                const errorPayload = result.error;
                throw new AlternunProviderError(typeof errorPayload.message === 'string' ? errorPayload.message : 'Email sign up failed');
            }
            const normalizedSession = normalizeSession(result, 'email');
            const verifiedEmailSignup = isVerifiedEmailSignup(result);
            const accessToken = (_h = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.accessToken) !== null && _h !== void 0 ? _h : null;
            const needsEmailVerification = typeof (result === null || result === void 0 ? void 0 : result.needsEmailVerification) === 'boolean'
                ? result.needsEmailVerification
                : !verifiedEmailSignup || !accessToken;
            const confirmationEmailSent = typeof (result === null || result === void 0 ? void 0 : result.confirmationEmailSent) === 'boolean'
                ? result.confirmationEmailSent
                : !verifiedEmailSignup || !accessToken;
            return {
                session: verifiedEmailSignup ? normalizedSession : null,
                externalIdentity: (_j = normalizedSession === null || normalizedSession === void 0 ? void 0 : normalizedSession.externalIdentity) !== null && _j !== void 0 ? _j : null,
                needsEmailVerification,
                emailAlreadyRegistered: false,
                confirmationEmailSent,
            };
        }
        const response = await callJson(this.fetchFn, this.requireBaseUrl(), (_l = (_k = this.options.signUpEmailPath) !== null && _k !== void 0 ? _k : this.options.signUpPath) !== null && _l !== void 0 ? _l : '/auth/sign-up/email', {
            email: input.email,
            password: input.password,
            name: signUpName,
            locale: input.locale,
            callbackURL: undefined,
            metadata: input.metadata,
            ...(((_m = input.referral) === null || _m === void 0 ? void 0 : _m.referralCode) ? { referral_code: input.referral.referralCode } : {}),
            ...(((_o = input.referral) === null || _o === void 0 ? void 0 : _o.referredByUsername)
                ? { referred_by_username: input.referral.referredByUsername }
                : {}),
            ...(((_p = input.referral) === null || _p === void 0 ? void 0 : _p.referredByEmail)
                ? { referred_by_email: input.referral.referredByEmail }
                : {}),
        });
        const session = normalizeSession(response, 'email');
        const verifiedEmailSignup = isVerifiedEmailSignup(response);
        const accessToken = (_q = session === null || session === void 0 ? void 0 : session.accessToken) !== null && _q !== void 0 ? _q : null;
        const needsEmailVerification = typeof (response === null || response === void 0 ? void 0 : response.needsEmailVerification) === 'boolean'
            ? response.needsEmailVerification
            : !verifiedEmailSignup || !accessToken;
        const confirmationEmailSent = typeof (response === null || response === void 0 ? void 0 : response.confirmationEmailSent) === 'boolean'
            ? response.confirmationEmailSent
            : !verifiedEmailSignup || !accessToken;
        return {
            session: verifiedEmailSignup ? session : null,
            externalIdentity: (_r = session === null || session === void 0 ? void 0 : session.externalIdentity) !== null && _r !== void 0 ? _r : null,
            needsEmailVerification,
            emailAlreadyRegistered: false,
            confirmationEmailSent,
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const browserClient = await this.resolveBrowserClient();
        if (browserClient === null || browserClient === void 0 ? void 0 : browserClient.getSession) {
            try {
                const session = await browserClient.getSession();
                const normalized = normalizeSession(session, (_a = this.options.defaultProvider) !== null && _a !== void 0 ? _a : 'better-auth');
                if (normalized) {
                    return normalized;
                }
            }
            catch {
                // No Better Auth cookie is expected for legacy email sessions.
            }
        }
        if ((_b = this.client) === null || _b === void 0 ? void 0 : _b.getSession) {
            try {
                const session = await this.client.getSession();
                const normalized = normalizeSession(session, (_c = this.options.defaultProvider) !== null && _c !== void 0 ? _c : 'better-auth');
                if (normalized) {
                    return normalized;
                }
            }
            catch {
                // Keep probing the configured fallbacks below.
            }
        }
        if (((_d = this.client) === null || _d === void 0 ? void 0 : _d.getUser) && this.client.getSessionToken) {
            try {
                const user = await this.client.getUser();
                const token = await this.client.getSessionToken();
                if (user) {
                    return {
                        provider: (_f = (_e = user.provider) !== null && _e !== void 0 ? _e : this.options.defaultProvider) !== null && _f !== void 0 ? _f : 'better-auth',
                        accessToken: token !== null && token !== void 0 ? token : null,
                        refreshToken: null,
                        idToken: null,
                        expiresAt: null,
                        externalIdentity: claimsToExternalIdentity((_h = (_g = user.provider) !== null && _g !== void 0 ? _g : this.options.defaultProvider) !== null && _h !== void 0 ? _h : 'better-auth', (_j = user.metadata) !== null && _j !== void 0 ? _j : {}, (_k = user.providerUserId) !== null && _k !== void 0 ? _k : user.id),
                        linkedAccounts: [],
                        raw: { user },
                    };
                }
            }
            catch {
                // Keep probing the configured fallbacks below.
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
        const response = await callJson(this.fetchFn, this.requireBaseUrl(), (_l = this.options.sessionPath) !== null && _l !== void 0 ? _l : '/auth/session', {});
        return normalizeSession(response, (_m = this.options.defaultProvider) !== null && _m !== void 0 ? _m : 'better-auth');
    }
    async refreshExecutionSession() {
        return this.getExecutionSession();
    }
    async linkProvider(input) {
        var _a, _b, _c, _d, _e;
        const browserClient = await this.resolveBrowserClient();
        if (browserClient === null || browserClient === void 0 ? void 0 : browserClient.linkSocial) {
            await browserClient.linkSocial(input);
            return {
                provider: input.provider,
                providerUserId: input.providerUserId,
                type: input.type,
                email: input.email,
                metadata: (_a = input.metadata) !== null && _a !== void 0 ? _a : {},
            };
        }
        if ((_b = this.client) === null || _b === void 0 ? void 0 : _b.linkProvider) {
            await this.client.linkProvider(input);
        }
        else if (this.options.baseUrl) {
            await callJson(this.fetchFn, this.requireBaseUrl(), (_c = this.options.linkPath) !== null && _c !== void 0 ? _c : '/auth/link', {
                provider: input.provider,
                providerUserId: input.providerUserId,
                type: input.type,
                email: input.email,
                metadata: (_d = input.metadata) !== null && _d !== void 0 ? _d : {},
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
            metadata: (_e = input.metadata) !== null && _e !== void 0 ? _e : {},
        };
    }
    async unlinkProvider(input) {
        var _a, _b;
        const browserClient = await this.resolveBrowserClient();
        if (browserClient === null || browserClient === void 0 ? void 0 : browserClient.unlinkSocial) {
            await browserClient.unlinkSocial(input);
            return;
        }
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
        var _a, _b, _c, _d, _e;
        if (this.emailFallbackProvider) {
            return this.emailFallbackProvider.signInWithEmail(email, password);
        }
        const browserClient = await this.resolveBrowserClient();
        if ((_a = browserClient === null || browserClient === void 0 ? void 0 : browserClient.signIn) === null || _a === void 0 ? void 0 : _a.email) {
            const result = await browserClient.signIn.email({
                email,
                password,
            });
            const session = normalizeSession(result, 'email');
            const authResult = {
                session,
                externalIdentity: (_b = session === null || session === void 0 ? void 0 : session.externalIdentity) !== null && _b !== void 0 ? _b : null,
                needsEmailVerification: typeof (result === null || result === void 0 ? void 0 : result.needsEmailVerification) === 'boolean'
                    ? result.needsEmailVerification
                    : ((_c = session === null || session === void 0 ? void 0 : session.externalIdentity) === null || _c === void 0 ? void 0 : _c.emailVerified) === false,
                confirmationEmailSent: typeof (result === null || result === void 0 ? void 0 : result.confirmationEmailSent) === 'boolean'
                    ? result.confirmationEmailSent
                    : ((_d = session === null || session === void 0 ? void 0 : session.externalIdentity) === null || _d === void 0 ? void 0 : _d.emailVerified) === false,
                emailAlreadyRegistered: typeof (result === null || result === void 0 ? void 0 : result.emailAlreadyRegistered) === 'boolean'
                    ? result.emailAlreadyRegistered
                    : undefined,
            };
            if (isEmailVerificationPendingResult(authResult)) {
                throw new AlternunProviderError('Email not confirmed. Please check your inbox before signing in.');
            }
            if (session === null || session === void 0 ? void 0 : session.externalIdentity) {
                return {
                    id: session.externalIdentity.providerUserId,
                    email: session.externalIdentity.email,
                    avatarUrl: session.externalIdentity.avatarUrl,
                    provider: session.externalIdentity.provider,
                    providerUserId: session.externalIdentity.providerUserId,
                    metadata: session.externalIdentity.rawClaims,
                };
            }
        }
        if ((_e = this.client) === null || _e === void 0 ? void 0 : _e.signIn) {
            const result = await this.signIn({
                provider: 'email',
                flow: 'native',
                email,
                password,
            });
            if (isEmailVerificationPendingResult(result)) {
                throw new AlternunProviderError('Email not confirmed. Please check your inbox before signing in.');
            }
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
        const result = await this.signIn({
            provider: 'email',
            flow: 'native',
            email,
            password,
        });
        if (isEmailVerificationPendingResult(result)) {
            throw new AlternunProviderError('Email not confirmed. Please check your inbox before signing in.');
        }
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
    async signUpWithEmail(email, password, locale, referral) {
        if (this.emailFallbackProvider) {
            return (await this.emailFallbackProvider.signUpWithEmail(email, password, locale, referral !== null && referral !== void 0 ? referral : null));
        }
        return this.signUp({ email, password, locale, referral });
    }
    async resendEmailConfirmation(email) {
        if (this.emailFallbackProvider) {
            await this.emailFallbackProvider.resendEmailConfirmation(email);
            return;
        }
        if (this.options.baseUrl) {
            await callJson(this.fetchFn, this.requireBaseUrl(), '/auth/send-verification-email', {
                email,
            });
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
    async requestPasswordResetEmail(email, redirectTo) {
        var _a;
        if ((_a = this.emailFallbackProvider) === null || _a === void 0 ? void 0 : _a.requestPasswordResetEmail) {
            await this.emailFallbackProvider.requestPasswordResetEmail(email, redirectTo);
            return;
        }
        throw new AlternunProviderError('Supabase execution provider does not support password reset emails.');
    }
    async resetPassword(newPassword, token) {
        if (!token) {
            throw new AlternunProviderError('Password reset token is required.');
        }
        await callJson(this.fetchFn, this.requireBaseUrl(), '/auth/reset-password', {
            newPassword,
            token,
        });
    }
    async signInWithGoogle(redirectTo) {
        const result = await this.signInWithSocialProvider('google', redirectTo);
        const redirectTarget = result.redirectUrl;
        if (redirectTarget && typeof window !== 'undefined') {
            window.location.assign(redirectTarget);
        }
    }
    async signInWithDiscord(redirectTo) {
        const result = await this.signInWithSocialProvider('discord', redirectTo);
        const redirectTarget = result.redirectUrl;
        if (redirectTarget && typeof window !== 'undefined') {
            window.location.assign(redirectTarget);
        }
    }
    async signInWithSocialProvider(provider, redirectTo) {
        return this.signIn({
            provider,
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
        if (this.allowLegacySessionFallback) {
            const fallbackSession = await this.getFallbackExecutionSession();
            if (fallbackSession === null || fallbackSession === void 0 ? void 0 : fallbackSession.accessToken) {
                return fallbackSession.accessToken;
            }
        }
        const session = await this.getExecutionSession();
        return (_a = session === null || session === void 0 ? void 0 : session.accessToken) !== null && _a !== void 0 ? _a : null;
    }
    onAuthStateChange(callback) {
        var _a;
        if ((_a = this.emailFallbackProvider) === null || _a === void 0 ? void 0 : _a.onAuthStateChange) {
            return this.emailFallbackProvider.onAuthStateChange(callback);
        }
        void this.getUser()
            .then(callback)
            .catch(() => callback(null));
        return () => undefined;
    }
}
