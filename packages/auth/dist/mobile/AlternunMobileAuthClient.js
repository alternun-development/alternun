import { SupabaseClient as UniversalSupabaseClient, } from '@edcalderon/auth/supabase';
import { createClient, } from '@supabase/supabase-js';
import { getValidationErrorMessage, parseEmailAddress, parseSignInPassword, parseSignUpPassword, } from '../validation/authInputValidation';
const WALLET_PROVIDERS = ['metamask', 'walletconnect',];
const EMAIL_TEMPLATE_LOCALES = ['en', 'es', 'th',];
function resolveClientRuntime() {
    return typeof window !== 'undefined' && typeof document !== 'undefined' ? 'web' : 'native';
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
function isEmailAlreadyRegisteredError(errorMessage) {
    const normalized = errorMessage.toLowerCase();
    return (normalized.includes('already registered') ||
        normalized.includes('already been registered') ||
        normalized.includes('user already exists'));
}
function isObfuscatedExistingUserSignUpResult(data) {
    if (!data || data.session || !data.user) {
        return false;
    }
    const identities = Array.isArray(data.user.identities)
        ? data.user.identities.filter(Boolean)
        : null;
    return Array.isArray(identities) && identities.length === 0;
}
function isMissingSessionError(error) {
    const message = getErrorMessage(error).toLowerCase();
    return message.includes('auth session missing');
}
function parseVerificationCode(code) {
    const normalizedCode = code.trim().replace(/\s+/g, '');
    if (!normalizedCode) {
        throw new Error('Verification code is required.');
    }
    return normalizedCode;
}
function normalizeEmailTemplateLocale(value) {
    if (!value) {
        return null;
    }
    const normalized = value.toLowerCase().trim().replace('_', '-');
    const baseLocale = normalized.split('-')[0];
    return EMAIL_TEMPLATE_LOCALES.includes(baseLocale) ? baseLocale : null;
}
function makeWalletAddress() {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    let hex = '';
    for (const b of bytes) {
        hex += b.toString(16).padStart(2, '0');
    }
    return `0x${hex}`;
}
function extractWalletProvider(user) {
    if (!user) {
        return null;
    }
    if (typeof user.provider === 'string' && user.provider.startsWith('wallet:')) {
        const provider = user.provider.replace('wallet:', '').toLowerCase();
        if (provider === 'metamask' || provider === 'walletconnect') {
            return provider;
        }
    }
    const metadata = user.metadata && typeof user.metadata === 'object'
        ? user.metadata
        : {};
    const providerValue = typeof metadata.walletProvider === 'string'
        ? metadata.walletProvider.toLowerCase()
        : typeof metadata.wallet_provider === 'string'
            ? metadata.wallet_provider.toLowerCase()
            : null;
    if (providerValue === 'metamask' || providerValue === 'walletconnect') {
        return providerValue;
    }
    return null;
}
function extractWalletAddress(user) {
    if (!user) {
        return null;
    }
    const metadata = user.metadata && typeof user.metadata === 'object'
        ? user.metadata
        : {};
    const walletObject = typeof metadata.wallet === 'object' && metadata.wallet !== null
        ? metadata.wallet
        : null;
    const candidates = [
        metadata.walletAddress,
        metadata.wallet_address,
        metadata.address,
        walletObject === null || walletObject === void 0 ? void 0 : walletObject.address,
        walletObject === null || walletObject === void 0 ? void 0 : walletObject.walletAddress,
        user.providerUserId,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate;
        }
    }
    return null;
}
export function isWalletProvider(provider) {
    return Boolean(provider && WALLET_PROVIDERS.includes(provider.toLowerCase()));
}
export class AlternunMobileAuthClient {
    constructor(options) {
        var _a, _b, _c, _d;
        this.supabase = null;
        this.listeners = new Set();
        this.oidcUser = null;
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        this.unsubscribeBase = null;
        this.walletBridge = null;
        this.allowMockWalletFallback = false;
        this.allowWalletOnlySession = false;
        this.runtime = resolveClientRuntime();
        const supabaseKey = (_a = options.supabaseKey) !== null && _a !== void 0 ? _a : options.supabaseAnonKey;
        this.walletBridge = (_b = options.walletBridge) !== null && _b !== void 0 ? _b : null;
        this.allowMockWalletFallback = (_c = options.allowMockWalletFallback) !== null && _c !== void 0 ? _c : false;
        this.allowWalletOnlySession = (_d = options.allowWalletOnlySession) !== null && _d !== void 0 ? _d : false;
        if (options.supabaseUrl && supabaseKey) {
            const supabase = createClient(options.supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false,
                },
            });
            this.baseClient = new UniversalSupabaseClient({
                supabase,
                runtime: this.runtime,
            });
            this.supabase = supabase;
        }
        else {
            this.baseClient = null;
            this.supabase = null;
        }
    }
    capabilities() {
        var _a, _b;
        const baseFlows = (_b = (_a = this.baseClient) === null || _a === void 0 ? void 0 : _a.capabilities().supportedFlows) !== null && _b !== void 0 ? _b : [];
        const flowSet = new Set(baseFlows);
        if (this.runtime === 'native') {
            flowSet.add('native');
        }
        else {
            flowSet.add('redirect');
        }
        return {
            runtime: this.runtime,
            supportedFlows: Array.from(flowSet),
        };
    }
    emit(user) {
        this.listeners.forEach((listener) => {
            listener(user);
        });
    }
    ensureBaseClient() {
        if (!this.baseClient) {
            throw new Error('CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.');
        }
        return this.baseClient;
    }
    ensureSupabase() {
        if (!this.supabase) {
            throw new Error('CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.');
        }
        return this.supabase;
    }
    mapSupabaseUser(user) {
        var _a, _b, _c, _d;
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            avatarUrl: (_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.avatar_url,
            provider: (_b = user.app_metadata) === null || _b === void 0 ? void 0 : _b.provider,
            providerUserId: ((_c = user.app_metadata) === null || _c === void 0 ? void 0 : _c.provider_id) || ((_d = user.user_metadata) === null || _d === void 0 ? void 0 : _d.provider_id),
            metadata: user.user_metadata,
        };
    }
    applyLinkedWallet(user) {
        if (!user || !this.linkedWallet) {
            return user;
        }
        const metadata = user.metadata && typeof user.metadata === 'object'
            ? user.metadata
            : {};
        return {
            ...user,
            metadata: {
                ...metadata,
                walletProvider: this.linkedWallet.provider,
                walletAddress: this.linkedWallet.walletAddress,
                connectedAt: this.linkedWallet.connectedAt,
                ...this.linkedWallet.metadata,
            },
        };
    }
    getWalletUser(state) {
        return {
            id: `wallet:${state.provider}:${state.walletAddress}`,
            provider: `wallet:${state.provider}`,
            providerUserId: state.walletAddress,
            metadata: {
                walletProvider: state.provider,
                walletAddress: state.walletAddress,
                connectedAt: state.connectedAt,
                ...state.metadata,
            },
        };
    }
    async safeGetBaseUser() {
        if (!this.baseClient) {
            return null;
        }
        try {
            return await this.baseClient.getUser();
        }
        catch (error) {
            if (isMissingSessionError(error)) {
                return null;
            }
            throw error;
        }
    }
    toLinkedWalletState(provider, walletAddress, connectedAt = new Date().toISOString(), sessionToken = null, metadata = {}) {
        return {
            provider,
            walletAddress,
            connectedAt,
            sessionToken: sessionToken !== null && sessionToken !== void 0 ? sessionToken : walletAddress,
            metadata,
        };
    }
    hydrateWalletStateFromUser(user) {
        const provider = extractWalletProvider(user);
        if (!provider) {
            return null;
        }
        const walletAddress = extractWalletAddress(user);
        if (!walletAddress) {
            return null;
        }
        return this.toLinkedWalletState(provider, walletAddress);
    }
    buildWalletMetadataPayload(baseUser, linkedWallet) {
        const baseMetadata = baseUser.metadata && typeof baseUser.metadata === 'object'
            ? baseUser.metadata
            : {};
        const nextWallet = {
            provider: linkedWallet.provider,
            address: linkedWallet.walletAddress,
            connectedAt: linkedWallet.connectedAt,
            ...linkedWallet.metadata,
        };
        const existingLinkedWalletsRaw = baseMetadata.linkedWallets;
        const existingLinkedWallets = [];
        if (Array.isArray(existingLinkedWalletsRaw)) {
            for (const entry of existingLinkedWalletsRaw) {
                if (entry && typeof entry === 'object') {
                    existingLinkedWallets.push(entry);
                }
            }
        }
        const filteredExisting = existingLinkedWallets.filter((entry) => {
            const providerValue = typeof entry.provider === 'string' ? entry.provider.toLowerCase() : null;
            const addressValue = typeof entry.address === 'string' ? entry.address.toLowerCase() : null;
            return !(providerValue === linkedWallet.provider &&
                addressValue === linkedWallet.walletAddress.toLowerCase());
        });
        const walletObject = typeof baseMetadata.wallet === 'object' && baseMetadata.wallet !== null
            ? baseMetadata.wallet
            : {};
        return {
            ...baseMetadata,
            walletProvider: linkedWallet.provider,
            walletAddress: linkedWallet.walletAddress,
            connectedAt: linkedWallet.connectedAt,
            wallet: {
                ...walletObject,
                ...nextWallet,
            },
            linkedWallets: [nextWallet, ...filteredExisting,].slice(0, 5),
        };
    }
    resolveWalletChain(linkedWallet) {
        const chainCandidate = linkedWallet.metadata.chain;
        if (typeof chainCandidate === 'string' && chainCandidate.trim().length > 0) {
            return chainCandidate.trim().toLowerCase();
        }
        if (typeof linkedWallet.metadata.chainId === 'string' ||
            typeof linkedWallet.metadata.chainId === 'number') {
            return 'ethereum';
        }
        return 'ethereum';
    }
    async upsertWalletRegistryEntry(baseUser, linkedWallet) {
        if (!this.supabase) {
            return;
        }
        const chain = this.resolveWalletChain(linkedWallet);
        const walletAddressNormalized = linkedWallet.walletAddress.toLowerCase();
        const { error, } = await this.supabase.from('user_wallets').upsert({
            user_id: baseUser.id,
            chain,
            wallet_provider: linkedWallet.provider,
            wallet_address: linkedWallet.walletAddress,
            wallet_address_normalized: walletAddressNormalized,
            is_primary: true,
            linked_at: linkedWallet.connectedAt,
            last_used_at: new Date().toISOString(),
            metadata: linkedWallet.metadata,
        }, {
            onConflict: 'user_id,chain,wallet_address_normalized',
        });
        if (!error) {
            return;
        }
        const typedError = error;
        if (typedError.code === '42P01') {
            throw new Error('CONFIG_ERROR: Missing public.user_wallets table. Run the wallet schema migration.');
        }
        throw new Error(`PROVIDER_ERROR: Failed to persist wallet registry record: ${typedError.message}`);
    }
    async persistLinkedWalletOnBaseUser(baseUser, linkedWallet) {
        if (!this.supabase) {
            return this.applyLinkedWallet(baseUser);
        }
        await this.upsertWalletRegistryEntry(baseUser, linkedWallet);
        const metadata = this.buildWalletMetadataPayload(baseUser, linkedWallet);
        const { data, error, } = await this.supabase.auth.updateUser({
            data: metadata,
        });
        if (error) {
            throw new Error(`PROVIDER_ERROR: Failed to link wallet: ${error.message}`);
        }
        if (!(data === null || data === void 0 ? void 0 : data.user)) {
            return this.applyLinkedWallet(baseUser);
        }
        const mappedUser = this.mapSupabaseUser(data.user);
        return this.applyLinkedWallet(mappedUser);
    }
    async getUser() {
        if (this.oidcUser) {
            return this.oidcUser;
        }
        if (this.walletUser) {
            return this.walletUser;
        }
        const user = await this.safeGetBaseUser();
        if (!user) {
            return null;
        }
        if (!this.linkedWallet) {
            this.linkedWallet = this.hydrateWalletStateFromUser(user);
        }
        return this.applyLinkedWallet(user);
    }
    async signInWithEmail(email, password) {
        let normalizedEmail;
        let validatedPassword;
        try {
            normalizedEmail = parseEmailAddress(email);
            validatedPassword = parseSignInPassword(password);
        }
        catch (validationError) {
            throw new Error(`VALIDATION_ERROR: ${getValidationErrorMessage(validationError, 'Email and password are required.')}`);
        }
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        const user = await this.ensureBaseClient().signInWithEmail(normalizedEmail, validatedPassword);
        this.emit(user);
        return user;
    }
    async signInWalletWithBase(provider) {
        if (!this.baseClient) {
            return false;
        }
        await this.baseClient.signIn({
            provider,
            flow: 'native',
        });
        const baseUser = await this.safeGetBaseUser();
        if (!baseUser) {
            return false;
        }
        const linkedWallet = this.hydrateWalletStateFromUser(baseUser);
        if (!linkedWallet) {
            throw new Error('PROVIDER_ERROR: Wallet provider did not return a valid wallet identity.');
        }
        this.walletUser = null;
        this.linkedWallet = linkedWallet;
        this.walletSessionToken = linkedWallet.sessionToken;
        this.emit(this.applyLinkedWallet(baseUser));
        return true;
    }
    async signInWalletWithBridge(provider, existingBaseUser = null) {
        var _a, _b;
        if (!this.walletBridge) {
            throw new Error(`UNSUPPORTED_FLOW: ${provider} requires wallet bridge configuration.`);
        }
        const result = await this.walletBridge.connect(provider);
        const linkedWallet = this.toLinkedWalletState(provider, result.walletAddress, result.connectedAt, (_a = result.sessionToken) !== null && _a !== void 0 ? _a : null, (_b = result.metadata) !== null && _b !== void 0 ? _b : {});
        const baseUser = existingBaseUser !== null && existingBaseUser !== void 0 ? existingBaseUser : (await this.safeGetBaseUser());
        if (baseUser) {
            this.walletUser = null;
            this.linkedWallet = linkedWallet;
            this.walletSessionToken = linkedWallet.sessionToken;
            const persistedUser = await this.persistLinkedWalletOnBaseUser(baseUser, linkedWallet);
            this.emit(persistedUser !== null && persistedUser !== void 0 ? persistedUser : this.applyLinkedWallet(baseUser));
            return;
        }
        if (!this.allowWalletOnlySession) {
            throw new Error('UNSUPPORTED_FLOW: Wallet-only login is disabled. Sign in with email or Google first, then connect your wallet.');
        }
        this.linkedWallet = null;
        this.walletUser = this.getWalletUser(linkedWallet);
        this.walletSessionToken = linkedWallet.sessionToken;
        this.emit(this.walletUser);
    }
    signInWalletWithFallback(provider, existingBaseUser = null) {
        if (!this.allowMockWalletFallback) {
            throw new Error(`UNSUPPORTED_FLOW: ${provider} is not configured. Add a wallet bridge or configure provider auth.`);
        }
        const linkedWallet = this.toLinkedWalletState(provider, makeWalletAddress(), new Date().toISOString(), null, {
            previewWallet: true,
        });
        if (existingBaseUser) {
            this.walletUser = null;
            this.linkedWallet = linkedWallet;
            this.walletSessionToken = linkedWallet.sessionToken;
            this.emit(this.applyLinkedWallet(existingBaseUser));
            return;
        }
        this.linkedWallet = null;
        this.walletUser = this.getWalletUser(linkedWallet);
        this.walletSessionToken = linkedWallet.sessionToken;
        this.emit(this.walletUser);
    }
    async signIn(options) {
        var _a, _b;
        const provider = (_a = options.provider) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (!isWalletProvider(provider)) {
            this.walletUser = null;
            this.linkedWallet = null;
            this.walletSessionToken = null;
            await this.ensureBaseClient().signIn({
                provider: options.provider,
                flow: (_b = options.flow) !== null && _b !== void 0 ? _b : (this.runtime === 'web' ? 'redirect' : 'native'),
                redirectUri: options.redirectUri,
            });
            return;
        }
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        const existingBaseUser = await this.safeGetBaseUser();
        if (existingBaseUser) {
            try {
                await this.signInWalletWithBridge(provider, existingBaseUser);
                return;
            }
            catch (error) {
                if (!this.walletBridge) {
                    this.signInWalletWithFallback(provider, existingBaseUser);
                    return;
                }
                throw error;
            }
        }
        // Provider-specific wallet UX (MetaMask / WalletConnect) must be launched by the app bridge first.
        if (this.walletBridge) {
            await this.signInWalletWithBridge(provider);
            return;
        }
        let baseError = null;
        try {
            const handledByBase = await this.signInWalletWithBase(provider);
            if (handledByBase) {
                return;
            }
        }
        catch (error) {
            baseError = error;
        }
        try {
            await this.signInWalletWithBridge(provider);
            return;
        }
        catch (error) {
            if (!this.walletBridge) {
                this.signInWalletWithFallback(provider);
                return;
            }
            if (baseError) {
                throw new Error(`PROVIDER_ERROR: ${getErrorMessage(baseError)} | Wallet bridge fallback failed: ${getErrorMessage(error)}`);
            }
            throw error;
        }
    }
    async signInWithGoogle(redirectTo) {
        await this.signIn({
            provider: 'google',
            flow: this.runtime === 'web' ? 'redirect' : 'native',
            redirectUri: redirectTo,
        });
    }
    async signUpWithEmail(email, password, locale) {
        let normalizedEmail;
        let validatedPassword;
        try {
            normalizedEmail = parseEmailAddress(email);
            validatedPassword = parseSignUpPassword(password);
        }
        catch (validationError) {
            throw new Error(`VALIDATION_ERROR: ${getValidationErrorMessage(validationError, 'Enter a valid email address and password.')}`);
        }
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        const supabase = this.ensureSupabase();
        const emailTemplateLocale = normalizeEmailTemplateLocale(locale);
        const { data, error, } = await supabase.auth.signUp(emailTemplateLocale
            ? {
                email: normalizedEmail,
                password: validatedPassword,
                options: {
                    data: {
                        locale: emailTemplateLocale,
                    },
                },
            }
            : {
                email: normalizedEmail,
                password: validatedPassword,
            });
        if (error) {
            if (isEmailAlreadyRegisteredError(error.message)) {
                return {
                    needsEmailVerification: true,
                    emailAlreadyRegistered: true,
                    confirmationEmailSent: false,
                };
            }
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
        if (isObfuscatedExistingUserSignUpResult(data)) {
            return {
                needsEmailVerification: true,
                emailAlreadyRegistered: true,
                confirmationEmailSent: false,
            };
        }
        const hasSession = Boolean(data.session);
        if (hasSession) {
            this.emit(this.mapSupabaseUser(data.user));
        }
        return {
            needsEmailVerification: !hasSession,
            emailAlreadyRegistered: false,
            confirmationEmailSent: !hasSession,
        };
    }
    async resendEmailConfirmation(email) {
        let normalizedEmail;
        try {
            normalizedEmail = parseEmailAddress(email);
        }
        catch (validationError) {
            throw new Error(`VALIDATION_ERROR: ${getValidationErrorMessage(validationError, 'Enter a valid email address.')}`);
        }
        const supabase = this.ensureSupabase();
        const { error, } = await supabase.auth.resend({
            type: 'signup',
            email: normalizedEmail,
        });
        if (error) {
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
    }
    async verifyEmailConfirmationCode(email, code) {
        let normalizedEmail;
        let normalizedCode;
        try {
            normalizedEmail = parseEmailAddress(email);
            normalizedCode = parseVerificationCode(code);
        }
        catch (validationError) {
            throw new Error(`VALIDATION_ERROR: ${getValidationErrorMessage(validationError, 'Enter a valid email address and verification code.')}`);
        }
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        const supabase = this.ensureSupabase();
        const { data, error, } = await supabase.auth.verifyOtp({
            type: 'signup',
            email: normalizedEmail,
            token: normalizedCode,
        });
        if (error) {
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
        if (data === null || data === void 0 ? void 0 : data.user) {
            this.emit(this.mapSupabaseUser(data.user));
            return;
        }
        const currentUser = await this.safeGetBaseUser();
        this.emit(currentUser);
    }
    async signOut() {
        var _a, _b;
        const walletState = (_a = this.linkedWallet) !== null && _a !== void 0 ? _a : (this.walletUser ? this.hydrateWalletStateFromUser(this.walletUser) : null);
        if (walletState && ((_b = this.walletBridge) === null || _b === void 0 ? void 0 : _b.disconnect)) {
            try {
                await this.walletBridge.disconnect(walletState.provider, walletState.walletAddress);
            }
            catch {
                // Ignore bridge disconnect errors to avoid trapping users in signed-in state.
            }
        }
        this.oidcUser = null;
        const hadWallet = Boolean(this.walletUser || this.linkedWallet);
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        if (this.baseClient) {
            try {
                await this.baseClient.signOut();
            }
            catch (error) {
                if (!hadWallet) {
                    throw error;
                }
            }
        }
        this.emit(null);
    }
    /**
     * Inject a user that was authenticated externally via Authentik OIDC.
     * Call with null to clear the OIDC session (e.g. on sign-out).
     */
    setOidcUser(user) {
        this.oidcUser = user;
        this.emit(user);
    }
    onAuthStateChange(callback) {
        this.listeners.add(callback);
        if (!this.unsubscribeBase && this.baseClient) {
            this.unsubscribeBase = this.baseClient.onAuthStateChange((user) => {
                if (this.walletUser) {
                    return;
                }
                if (!this.linkedWallet) {
                    this.linkedWallet = this.hydrateWalletStateFromUser(user);
                }
                this.emit(this.applyLinkedWallet(user));
            });
        }
        void this.getUser()
            .then(callback)
            .catch(() => callback(null));
        return () => {
            this.listeners.delete(callback);
            if (this.listeners.size === 0 && this.unsubscribeBase) {
                this.unsubscribeBase();
                this.unsubscribeBase = null;
            }
        };
    }
    async getSessionToken() {
        var _a;
        if (this.walletSessionToken) {
            return this.walletSessionToken;
        }
        if ((_a = this.walletUser) === null || _a === void 0 ? void 0 : _a.providerUserId) {
            return this.walletUser.providerUserId;
        }
        if (!this.baseClient) {
            return null;
        }
        return this.baseClient.getSessionToken();
    }
}
export function createAlternunMobileAuthClient(options) {
    return new AlternunMobileAuthClient(options);
}
export const SUPPORTED_WALLET_PROVIDERS = WALLET_PROVIDERS;
