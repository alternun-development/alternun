import { AlternunProviderError } from '../../core/errors';
function extractMetadata(user) {
    if (!(user === null || user === void 0 ? void 0 : user.metadata) || typeof user.metadata !== 'object') {
        return {};
    }
    return user.metadata;
}
function mapUserToExternalIdentity(user) {
    var _a, _b;
    if (!user) {
        return null;
    }
    const metadata = extractMetadata(user);
    const provider = (_a = user.provider) !== null && _a !== void 0 ? _a : (typeof metadata.provider === 'string' ? metadata.provider : 'supabase');
    const providerUserId = (_b = user.providerUserId) !== null && _b !== void 0 ? _b : (typeof metadata.providerUserId === 'string' ? metadata.providerUserId : user.id);
    return {
        provider,
        providerUserId,
        email: user.email,
        emailVerified: typeof metadata.emailVerified === 'boolean' ? metadata.emailVerified : undefined,
        displayName: typeof metadata.name === 'string'
            ? metadata.name
            : typeof metadata.displayName === 'string'
                ? metadata.displayName
                : undefined,
        avatarUrl: user.avatarUrl,
        rawClaims: metadata,
    };
}
function extractLinkedAccounts(user) {
    var _a, _b;
    if (!user) {
        return [];
    }
    const metadata = extractMetadata(user);
    const linkedAccountsRaw = metadata.linkedAccounts;
    if (Array.isArray(linkedAccountsRaw)) {
        const linkedAccounts = [];
        for (const entry of linkedAccountsRaw) {
            if (!entry || typeof entry !== 'object') {
                continue;
            }
            const typedEntry = entry;
            if (typeof typedEntry.provider !== 'string' ||
                typeof typedEntry.providerUserId !== 'string') {
                continue;
            }
            linkedAccounts.push({
                provider: typedEntry.provider,
                providerUserId: typedEntry.providerUserId,
                type: (_a = typedEntry.type) !== null && _a !== void 0 ? _a : 'custom',
                email: typedEntry.email,
                displayName: typedEntry.displayName,
                linkedAt: typedEntry.linkedAt,
                metadata: (_b = typedEntry.metadata) !== null && _b !== void 0 ? _b : {},
            });
        }
        if (linkedAccounts.length > 0) {
            return linkedAccounts;
        }
    }
    const walletProvider = typeof metadata.walletProvider === 'string' ? metadata.walletProvider : null;
    const walletObject = typeof metadata.wallet === 'object' && metadata.wallet !== null
        ? metadata.wallet
        : null;
    const walletAddress = typeof metadata.walletAddress === 'string'
        ? metadata.walletAddress
        : typeof (walletObject === null || walletObject === void 0 ? void 0 : walletObject.address) === 'string'
            ? walletObject.address
            : null;
    if (walletProvider && walletAddress) {
        return [
            {
                provider: walletProvider,
                providerUserId: walletAddress,
                type: 'wallet',
                email: user.email,
                displayName: typeof metadata.walletDisplayName === 'string' ? metadata.walletDisplayName : undefined,
                linkedAt: typeof metadata.connectedAt === 'string' ? metadata.connectedAt : undefined,
                metadata,
            },
        ];
    }
    return [];
}
function buildExecutionSession(client, user) {
    return client
        .getSessionToken()
        .then((token) => {
        var _a;
        if (!user) {
            return null;
        }
        const identity = mapUserToExternalIdentity(user);
        return {
            provider: (_a = user.provider) !== null && _a !== void 0 ? _a : 'supabase',
            accessToken: token !== null && token !== void 0 ? token : null,
            refreshToken: null,
            idToken: null,
            expiresAt: null,
            externalIdentity: identity,
            linkedAccounts: extractLinkedAccounts(user),
            raw: {
                user,
                runtime: client.runtime,
            },
        };
    })
        .catch(() => null);
}
export class SupabaseExecutionProvider {
    constructor(client) {
        this.client = client;
        this.name = 'supabase';
    }
    async signIn(options) {
        var _a, _b, _c, _d;
        const provider = (_a = options.provider) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (provider === 'email') {
            if (options.email && options.password) {
                await this.client.signInWithEmail(options.email, options.password);
            }
            else {
                throw new AlternunProviderError('Email sign-in requires email and password.');
            }
        }
        else {
            await this.client.signIn({
                provider: options.provider,
                flow: (_b = options.flow) !== null && _b !== void 0 ? _b : (this.client.runtime === 'web' ? 'redirect' : 'native'),
                redirectUri: options.redirectUri,
                web3: options.web3,
            });
        }
        const session = await this.getExecutionSession();
        return {
            session,
            externalIdentity: (_c = session === null || session === void 0 ? void 0 : session.externalIdentity) !== null && _c !== void 0 ? _c : null,
            redirectUrl: (_d = options.redirectUri) !== null && _d !== void 0 ? _d : null,
            needsEmailVerification: false,
            emailAlreadyRegistered: false,
            confirmationEmailSent: false,
        };
    }
    async signUp(input) {
        var _a;
        if (!this.client.signUpWithEmail) {
            throw new AlternunProviderError('Supabase execution provider does not support sign-up.');
        }
        const outcome = await this.client.signUpWithEmail(input.email, input.password, input.locale);
        const session = await this.getExecutionSession();
        return {
            session,
            externalIdentity: (_a = session === null || session === void 0 ? void 0 : session.externalIdentity) !== null && _a !== void 0 ? _a : null,
            needsEmailVerification: typeof outcome === 'object' && outcome !== null && 'needsEmailVerification' in outcome
                ? Boolean(outcome.needsEmailVerification)
                : !session,
            emailAlreadyRegistered: typeof outcome === 'object' && outcome !== null && 'emailAlreadyRegistered' in outcome
                ? Boolean(outcome.emailAlreadyRegistered)
                : false,
            confirmationEmailSent: typeof outcome === 'object' && outcome !== null && 'confirmationEmailSent' in outcome
                ? Boolean(outcome.confirmationEmailSent)
                : false,
        };
    }
    async signOut() {
        await this.client.signOut();
    }
    async getExecutionSession() {
        const user = await this.client.getUser().catch(() => null);
        return buildExecutionSession(this.client, user);
    }
    async refreshExecutionSession() {
        return this.getExecutionSession();
    }
    async linkProvider(input) {
        var _a, _b, _c, _d;
        const session = await this.getExecutionSession();
        if (!session) {
            return null;
        }
        const linkedAccount = {
            provider: input.provider,
            providerUserId: input.providerUserId,
            type: input.type,
            email: (_a = input.email) !== null && _a !== void 0 ? _a : (_b = session.externalIdentity) === null || _b === void 0 ? void 0 : _b.email,
            metadata: (_c = input.metadata) !== null && _c !== void 0 ? _c : {},
        };
        const user = await this.client.getUser().catch(() => null);
        if (user && this.client.setOidcUser) {
            this.client.setOidcUser({
                ...user,
                metadata: {
                    ...((_d = extractMetadata(user)) !== null && _d !== void 0 ? _d : {}),
                    linkedAccounts: [...extractLinkedAccounts(user), linkedAccount],
                },
            });
        }
        return linkedAccount;
    }
    async unlinkProvider(input) {
        const user = await this.client.getUser().catch(() => null);
        if (!user || !this.client.setOidcUser) {
            return;
        }
        const metadata = extractMetadata(user);
        const linkedAccountsRaw = Array.isArray(metadata.linkedAccounts) ? metadata.linkedAccounts : [];
        const nextLinkedAccounts = linkedAccountsRaw.filter((entry) => {
            if (!entry || typeof entry !== 'object') {
                return false;
            }
            const typedEntry = entry;
            return !(typedEntry.provider === input.provider &&
                typedEntry.providerUserId === input.providerUserId &&
                typedEntry.type === input.type);
        });
        this.client.setOidcUser({
            ...user,
            metadata: {
                ...metadata,
                linkedAccounts: nextLinkedAccounts,
            },
        });
    }
    signInWithEmail(email, password) {
        return this.client.signInWithEmail(email, password);
    }
    signUpWithEmail(email, password, locale) {
        if (!this.client.signUpWithEmail) {
            throw new AlternunProviderError('Supabase execution provider does not support sign-up.');
        }
        return this.client.signUpWithEmail(email, password, locale);
    }
    async resendEmailConfirmation(email) {
        if (!this.client.resendEmailConfirmation) {
            throw new AlternunProviderError('Supabase execution provider does not support email confirmation resend.');
        }
        await this.client.resendEmailConfirmation(email);
    }
    async verifyEmailConfirmationCode(email, code) {
        if (!this.client.verifyEmailConfirmationCode) {
            throw new AlternunProviderError('Supabase execution provider does not support verification code confirmation.');
        }
        await this.client.verifyEmailConfirmationCode(email, code);
    }
    async signInWithGoogle(redirectTo) {
        await this.client.signIn({
            provider: 'google',
            flow: this.client.runtime === 'web' ? 'redirect' : 'native',
            redirectUri: redirectTo,
        });
    }
    capabilities() {
        return this.client.capabilities();
    }
    onAuthStateChange(callback) {
        return this.client.onAuthStateChange(callback);
    }
    get supabase() {
        return this.client.supabase;
    }
    get runtime() {
        return this.client.runtime;
    }
    async getUser() {
        return this.client.getUser();
    }
    async getSessionToken() {
        return this.client.getSessionToken();
    }
}
