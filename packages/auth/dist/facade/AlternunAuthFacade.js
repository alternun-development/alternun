import { AlternunProviderError, toAlternunAuthError } from '../core/errors.js';
import { createAlternunSession, executionSessionToUser, issuerSessionToUser, principalToUser } from '../core/session.js';
function uniqueFlows(...candidates) {
    return Array.from(new Set(candidates.filter(Boolean)));
}
function isEmailAuthResult(value) {
    return Boolean(value && typeof value === 'object');
}
export class AlternunAuthFacade {
    constructor(options) {
        this.options = options;
        this.currentUser = null;
        this.currentCompatUser = null;
        this.currentExecutionSession = null;
        this.currentIssuerSession = null;
        this.currentAlternunSession = null;
        this.lastExchangeKey = null;
        this.providerUnsubscribe = null;
        this.listeners = new Set();
        this.runtime = options.runtime.runtime;
    }
    get executionProvider() {
        return this.options.executionProvider;
    }
    get issuerProvider() {
        return this.options.issuerProvider;
    }
    get emailProvider() {
        return this.options.emailProvider;
    }
    get identityRepository() {
        return this.options.identityRepository;
    }
    get supabase() {
        var _a;
        return (_a = this.executionProvider.supabase) !== null && _a !== void 0 ? _a : null;
    }
    capabilities() {
        var _a, _b, _c, _d;
        const providerCapabilities = (_b = (_a = this.executionProvider).capabilities) === null || _b === void 0 ? void 0 : _b.call(_a);
        const runtime = (_c = providerCapabilities === null || providerCapabilities === void 0 ? void 0 : providerCapabilities.runtime) !== null && _c !== void 0 ? _c : this.runtime;
        const supportedFlows = uniqueFlows(...((_d = providerCapabilities === null || providerCapabilities === void 0 ? void 0 : providerCapabilities.supportedFlows) !== null && _d !== void 0 ? _d : []), this.runtime === 'web' ? 'redirect' : 'native');
        return {
            runtime,
            supportedFlows,
        };
    }
    log(channel, action, outcome, details, message) {
        var _a;
        (_a = this.options.logger) === null || _a === void 0 ? void 0 : _a.log({
            channel,
            action,
            outcome,
            details,
            message,
        });
    }
    emit(user) {
        this.currentUser = user;
        for (const listener of this.listeners) {
            listener(user);
        }
    }
    attachExecutionSubscription() {
        if (this.providerUnsubscribe || !this.executionProvider.onAuthStateChange) {
            return;
        }
        this.providerUnsubscribe = this.executionProvider.onAuthStateChange((user) => {
            this.currentCompatUser = user;
            void this.refreshState('execution-provider-change', {
                allowExchange: true,
                preferExecution: true,
            }).catch(() => {
                this.emit(user);
            });
        });
    }
    detachExecutionSubscription() {
        if (!this.providerUnsubscribe || this.listeners.size > 0) {
            return;
        }
        this.providerUnsubscribe();
        this.providerUnsubscribe = null;
    }
    async safeGetExecutionSession() {
        try {
            return await this.executionProvider.getExecutionSession();
        }
        catch (error) {
            this.log('execution-provider', 'getExecutionSession', 'failure', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    async safeGetIssuerSession() {
        try {
            return await this.issuerProvider.getIssuerSession();
        }
        catch (error) {
            this.log('issuer-exchange', 'getIssuerSession', 'failure', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    async safeExchangeIdentity(executionSession, trigger) {
        var _a, _b;
        const externalIdentity = executionSession.externalIdentity;
        if (!externalIdentity) {
            return null;
        }
        const exchangeKey = `${externalIdentity.provider}:${externalIdentity.providerUserId}:${(_a = executionSession.accessToken) !== null && _a !== void 0 ? _a : ''}:${(_b = executionSession.refreshToken) !== null && _b !== void 0 ? _b : ''}`;
        if (this.currentAlternunSession && this.lastExchangeKey === exchangeKey) {
            return this.currentAlternunSession;
        }
        this.log('issuer-exchange', 'exchangeIdentity', 'start', {
            provider: externalIdentity.provider,
            providerUserId: externalIdentity.providerUserId,
            trigger,
        });
        try {
            const session = await this.issuerProvider.exchangeIdentity({
                externalIdentity,
                executionSession,
                claims: externalIdentity.rawClaims,
                context: {
                    trigger,
                    executionProvider: executionSession.provider,
                    issuerProvider: this.issuerProvider.name,
                    identityRepository: this.identityRepository.name,
                },
            });
            this.lastExchangeKey = exchangeKey;
            this.currentAlternunSession = session;
            this.currentIssuerSession = await this.safeGetIssuerSession();
            this.log('issuer-exchange', 'exchangeIdentity', 'success', {
                issuer: session.principal.issuer,
                subject: session.principal.subject,
            });
            return session;
        }
        catch (error) {
            this.log('issuer-exchange', 'exchangeIdentity', 'failure', {
                provider: externalIdentity.provider,
                providerUserId: externalIdentity.providerUserId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    buildUserFromAlternunSession(session, executionSession) {
        var _a, _b, _c, _d, _e, _f;
        return principalToUser(session.principal, {
            id: session.principal.subject,
            provider: (_a = executionSession === null || executionSession === void 0 ? void 0 : executionSession.provider) !== null && _a !== void 0 ? _a : (_b = session.linkedAccounts[0]) === null || _b === void 0 ? void 0 : _b.provider,
            providerUserId: (_d = (_c = executionSession === null || executionSession === void 0 ? void 0 : executionSession.externalIdentity) === null || _c === void 0 ? void 0 : _c.providerUserId) !== null && _d !== void 0 ? _d : (_e = session.linkedAccounts[0]) === null || _e === void 0 ? void 0 : _e.providerUserId,
            metadata: {
                issuerAccessToken: session.issuerAccessToken,
                issuerRefreshToken: (_f = session.issuerRefreshToken) !== null && _f !== void 0 ? _f : null,
                linkedAccounts: session.linkedAccounts,
            },
        });
    }
    async refreshState(trigger, options = {}) {
        var _a, _b, _c;
        const [issuerSession, executionSession] = await Promise.all([
            this.safeGetIssuerSession(),
            this.safeGetExecutionSession(),
        ]);
        const fallbackPrincipal = (_a = issuerSession === null || issuerSession === void 0 ? void 0 : issuerSession.principal) !== null && _a !== void 0 ? _a : null;
        this.currentIssuerSession = issuerSession;
        this.currentExecutionSession = executionSession;
        if (options.preferExecution &&
            (executionSession === null || executionSession === void 0 ? void 0 : executionSession.externalIdentity) &&
            options.allowExchange !== false) {
            const alternunSession = await this.safeExchangeIdentity(executionSession, trigger);
            if (alternunSession) {
                const user = this.buildUserFromAlternunSession(alternunSession, executionSession);
                this.currentCompatUser = user;
                this.emit(user);
                return user;
            }
        }
        if (issuerSession) {
            const user = issuerSessionToUser(issuerSession, executionSession);
            this.currentAlternunSession = executionSession
                ? {
                    issuerAccessToken: issuerSession.accessToken,
                    issuerRefreshToken: (_b = issuerSession.refreshToken) !== null && _b !== void 0 ? _b : null,
                    executionSession,
                    principal: issuerSession.principal,
                    linkedAccounts: issuerSession.linkedAccounts,
                }
                : {
                    issuerAccessToken: issuerSession.accessToken,
                    issuerRefreshToken: (_c = issuerSession.refreshToken) !== null && _c !== void 0 ? _c : null,
                    executionSession: null,
                    principal: issuerSession.principal,
                    linkedAccounts: issuerSession.linkedAccounts,
                };
            this.currentCompatUser = user;
            this.emit(user);
            return user;
        }
        if ((executionSession === null || executionSession === void 0 ? void 0 : executionSession.externalIdentity) && options.allowExchange !== false) {
            const alternunSession = await this.safeExchangeIdentity(executionSession, trigger);
            if (alternunSession) {
                const user = this.buildUserFromAlternunSession(alternunSession, executionSession);
                this.currentCompatUser = user;
                this.emit(user);
                return user;
            }
        }
        if (this.currentCompatUser) {
            this.emit(this.currentCompatUser);
            return this.currentCompatUser;
        }
        if (executionSession) {
            const user = executionSessionToUser(executionSession, fallbackPrincipal);
            this.currentCompatUser = user;
            this.emit(user);
            return user;
        }
        this.emit(null);
        return null;
    }
    async getUser() {
        return this.refreshState('getUser', { allowExchange: true });
    }
    async signInWithEmail(email, password) {
        var _a;
        if (this.executionProvider.signInWithEmail) {
            const user = await this.executionProvider.signInWithEmail(email, password);
            this.currentCompatUser = user;
            this.currentExecutionSession = await this.safeGetExecutionSession();
            await this.refreshState('signInWithEmail', {
                allowExchange: true,
                preferExecution: true,
            });
            return user;
        }
        const result = await this.executionProvider.signIn({
            provider: 'email',
            flow: this.runtime === 'web' ? 'redirect' : 'native',
            email,
            password,
        });
        if ((_a = result.session) === null || _a === void 0 ? void 0 : _a.externalIdentity) {
            this.currentExecutionSession = result.session;
            const alternunSession = await this.safeExchangeIdentity(result.session, 'signInWithEmail');
            if (alternunSession) {
                const user = this.buildUserFromAlternunSession(alternunSession, result.session);
                this.currentCompatUser = user;
                this.emit(user);
                return user;
            }
        }
        const user = await this.refreshState('signInWithEmail', {
            allowExchange: true,
            preferExecution: true,
        });
        if (user) {
            return user;
        }
        throw new AlternunProviderError('Email sign-in did not produce a user session.');
    }
    async signInWithGoogle(redirectTo) {
        await this.signIn({
            provider: 'google',
            flow: this.runtime === 'web' ? 'redirect' : 'native',
            redirectUri: redirectTo,
        });
    }
    async signIn(options) {
        var _a, _b, _c, _d;
        this.log('execution-provider', 'signIn', 'start', {
            provider: options.provider,
            flow: options.flow,
        });
        try {
            const result = await this.executionProvider.signIn({
                provider: (_a = options.provider) !== null && _a !== void 0 ? _a : 'google',
                flow: (_b = options.flow) !== null && _b !== void 0 ? _b : (this.runtime === 'web' ? 'redirect' : 'native'),
                redirectUri: options.redirectUri,
                web3: options.web3,
            });
            if (result.session) {
                this.currentExecutionSession = result.session;
            }
            if (result.externalIdentity && result.session) {
                const alternunSession = await this.safeExchangeIdentity(result.session, 'signIn');
                if (alternunSession) {
                    const user = this.buildUserFromAlternunSession(alternunSession, result.session);
                    this.currentCompatUser = user;
                    this.emit(user);
                    return;
                }
            }
            if (result.session) {
                const user = executionSessionToUser(result.session, (_d = (_c = this.currentIssuerSession) === null || _c === void 0 ? void 0 : _c.principal) !== null && _d !== void 0 ? _d : null);
                this.currentCompatUser = user;
                this.emit(user);
                return;
            }
            if (result.redirectUrl) {
                this.log('execution-provider', 'signIn', 'skipped', {
                    redirectUrl: result.redirectUrl,
                });
                return;
            }
            await this.refreshState('signIn', { allowExchange: true, preferExecution: true });
            this.log('execution-provider', 'signIn', 'success', {
                provider: options.provider,
            });
        }
        catch (error) {
            this.log('execution-provider', 'signIn', 'failure', {
                provider: options.provider,
                error: error instanceof Error ? error.message : String(error),
            });
            throw toAlternunAuthError(error);
        }
    }
    async signUpWithEmail(email, password, locale) {
        var _a, _b, _c, _d;
        if (this.executionProvider.signUpWithEmail) {
            const outcome = await this.executionProvider.signUpWithEmail(email, password, locale);
            const outcomeRecord = outcome;
            const result = isEmailAuthResult(outcome)
                ? {
                    session: null,
                    externalIdentity: null,
                    needsEmailVerification: typeof outcomeRecord.needsEmailVerification === 'boolean'
                        ? Boolean(outcomeRecord.needsEmailVerification)
                        : true,
                    emailAlreadyRegistered: typeof outcomeRecord.emailAlreadyRegistered === 'boolean'
                        ? Boolean(outcomeRecord.emailAlreadyRegistered)
                        : false,
                    confirmationEmailSent: typeof outcomeRecord.confirmationEmailSent === 'boolean'
                        ? Boolean(outcomeRecord.confirmationEmailSent)
                        : false,
                }
                : {
                    session: null,
                    externalIdentity: null,
                    needsEmailVerification: true,
                    emailAlreadyRegistered: false,
                    confirmationEmailSent: false,
                };
            this.log('execution-provider', 'signUpWithEmail', 'success', {
                needsEmailVerification: result.needsEmailVerification,
                emailAlreadyRegistered: result.emailAlreadyRegistered,
                confirmationEmailSent: result.confirmationEmailSent,
            });
            await this.refreshState('signUpWithEmail', {
                allowExchange: true,
                preferExecution: true,
            });
            return result;
        }
        const result = await this.executionProvider.signUp({
            email,
            password,
            locale,
        });
        if ((_a = result.session) === null || _a === void 0 ? void 0 : _a.externalIdentity) {
            this.currentExecutionSession = result.session;
            const alternunSession = await this.safeExchangeIdentity(result.session, 'signUpWithEmail');
            if (alternunSession) {
                const user = this.buildUserFromAlternunSession(alternunSession, result.session);
                this.currentCompatUser = user;
                this.emit(user);
            }
        }
        const normalized = {
            session: result.session,
            externalIdentity: result.externalIdentity,
            needsEmailVerification: Boolean((_b = result.needsEmailVerification) !== null && _b !== void 0 ? _b : !result.session),
            emailAlreadyRegistered: Boolean((_c = result.emailAlreadyRegistered) !== null && _c !== void 0 ? _c : false),
            confirmationEmailSent: Boolean((_d = result.confirmationEmailSent) !== null && _d !== void 0 ? _d : !result.session),
        };
        this.log('execution-provider', 'signUpWithEmail', 'success', {
            needsEmailVerification: normalized.needsEmailVerification,
            emailAlreadyRegistered: normalized.emailAlreadyRegistered,
            confirmationEmailSent: normalized.confirmationEmailSent,
        });
        return normalized;
    }
    async resendEmailConfirmation(email) {
        if (this.executionProvider.resendEmailConfirmation) {
            await this.executionProvider.resendEmailConfirmation(email);
            this.log('email-provider', 'resendEmailConfirmation', 'success', { email });
            return;
        }
        await this.emailProvider.sendVerificationEmail({
            email,
            templateName: 'verification',
            metadata: {
                source: 'facade',
            },
        });
        this.log('email-provider', 'sendVerificationEmail', 'success', { email });
    }
    async verifyEmailConfirmationCode(email, code) {
        if (this.executionProvider.verifyEmailConfirmationCode) {
            await this.executionProvider.verifyEmailConfirmationCode(email, code);
            this.log('email-provider', 'verifyEmailConfirmationCode', 'success', { email });
            return;
        }
        throw new AlternunProviderError('Email confirmation code verification is not supported by the active execution provider.');
    }
    async signOut() {
        this.log('execution-provider', 'signOut', 'start');
        await Promise.allSettled([
            this.executionProvider.signOut(),
            this.issuerProvider.logoutIssuerSession({ reason: 'signOut' }),
        ]);
        this.currentExecutionSession = null;
        this.currentIssuerSession = null;
        this.currentAlternunSession = null;
        this.currentCompatUser = null;
        this.lastExchangeKey = null;
        this.emit(null);
        this.log('execution-provider', 'signOut', 'success');
    }
    async getExecutionSession() {
        var _a;
        const session = (_a = this.currentExecutionSession) !== null && _a !== void 0 ? _a : (await this.safeGetExecutionSession());
        this.currentExecutionSession = session;
        return session;
    }
    async refreshExecutionSession() {
        this.currentExecutionSession = await this.executionProvider.refreshExecutionSession();
        await this.refreshState('refreshExecutionSession', { allowExchange: true });
        return this.currentExecutionSession;
    }
    async getIssuerSession() {
        var _a;
        const session = (_a = this.currentIssuerSession) !== null && _a !== void 0 ? _a : (await this.safeGetIssuerSession());
        this.currentIssuerSession = session;
        return session;
    }
    async refreshIssuerSession() {
        this.currentIssuerSession = await this.issuerProvider.refreshIssuerSession();
        await this.refreshState('refreshIssuerSession', { allowExchange: true });
        return this.currentIssuerSession;
    }
    async logoutIssuerSession(options) {
        await this.issuerProvider.logoutIssuerSession(options);
        this.currentIssuerSession = null;
        this.currentAlternunSession = null;
        await this.refreshState('logoutIssuerSession', { allowExchange: false });
    }
    async getAlternunSession() {
        if (this.currentAlternunSession) {
            return this.currentAlternunSession;
        }
        const issuerSession = await this.getIssuerSession();
        if (issuerSession) {
            const executionSession = await this.getExecutionSession();
            this.currentAlternunSession = createAlternunSession({
                issuerSession,
                executionSession,
            });
            return this.currentAlternunSession;
        }
        const executionSession = await this.getExecutionSession();
        if (executionSession === null || executionSession === void 0 ? void 0 : executionSession.externalIdentity) {
            const alternunSession = await this.safeExchangeIdentity(executionSession, 'getAlternunSession');
            if (alternunSession) {
                return alternunSession;
            }
        }
        return null;
    }
    onAuthStateChange(callback) {
        this.listeners.add(callback);
        this.attachExecutionSubscription();
        void this.getUser()
            .then((user) => callback(user))
            .catch(() => callback(null));
        return () => {
            this.listeners.delete(callback);
            this.detachExecutionSubscription();
        };
    }
    setOidcUser(user) {
        this.currentCompatUser = user;
        this.emit(user);
    }
    async getSessionToken() {
        var _a;
        const alternunSession = await this.getAlternunSession();
        if (alternunSession === null || alternunSession === void 0 ? void 0 : alternunSession.issuerAccessToken) {
            return alternunSession.issuerAccessToken;
        }
        const issuerSession = await this.getIssuerSession();
        if (issuerSession === null || issuerSession === void 0 ? void 0 : issuerSession.accessToken) {
            return issuerSession.accessToken;
        }
        const executionSession = await this.getExecutionSession();
        return (_a = executionSession === null || executionSession === void 0 ? void 0 : executionSession.accessToken) !== null && _a !== void 0 ? _a : null;
    }
}
