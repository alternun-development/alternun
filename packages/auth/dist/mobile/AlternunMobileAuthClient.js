import { SupabaseClient as UniversalSupabaseClient } from "@edcalderon/auth/supabase";
import { createClient } from "@supabase/supabase-js";
const WALLET_PROVIDERS = ["metamask", "walletconnect"];
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
function isMissingSessionError(error) {
    const message = getErrorMessage(error).toLowerCase();
    return message.includes("auth session missing");
}
function makeWalletAddress() {
    const seed = Math.random()
        .toString(16)
        .replace(".", "")
        .padEnd(40, "0")
        .slice(0, 40);
    return `0x${seed}`;
}
function extractWalletProvider(user) {
    if (!user) {
        return null;
    }
    if (typeof user.provider === "string" && user.provider.startsWith("wallet:")) {
        const provider = user.provider.replace("wallet:", "").toLowerCase();
        if (provider === "metamask" || provider === "walletconnect") {
            return provider;
        }
    }
    const metadata = user.metadata && typeof user.metadata === "object"
        ? user.metadata
        : {};
    const providerValue = typeof metadata.walletProvider === "string"
        ? metadata.walletProvider.toLowerCase()
        : typeof metadata.wallet_provider === "string"
            ? metadata.wallet_provider.toLowerCase()
            : null;
    if (providerValue === "metamask" || providerValue === "walletconnect") {
        return providerValue;
    }
    return null;
}
function extractWalletAddress(user) {
    if (!user) {
        return null;
    }
    const metadata = user.metadata && typeof user.metadata === "object"
        ? user.metadata
        : {};
    const walletObject = typeof metadata.wallet === "object" && metadata.wallet !== null
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
        if (typeof candidate === "string" && candidate.trim().length > 0) {
            return candidate;
        }
    }
    return null;
}
export function isWalletProvider(provider) {
    return Boolean(provider &&
        WALLET_PROVIDERS.includes(provider.toLowerCase()));
}
export class AlternunMobileAuthClient {
    constructor(options) {
        var _a, _b, _c;
        this.runtime = "native";
        this.supabase = null;
        this.listeners = new Set();
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        this.unsubscribeBase = null;
        this.walletBridge = null;
        this.allowMockWalletFallback = true;
        const supabaseKey = (_a = options.supabaseKey) !== null && _a !== void 0 ? _a : options.supabaseAnonKey;
        this.walletBridge = (_b = options.walletBridge) !== null && _b !== void 0 ? _b : null;
        this.allowMockWalletFallback = (_c = options.allowMockWalletFallback) !== null && _c !== void 0 ? _c : true;
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
                runtime: "native",
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
        const flowSet = new Set(["native", ...baseFlows]);
        return {
            runtime: this.runtime,
            supportedFlows: Array.from(flowSet),
        };
    }
    emit(user) {
        this.listeners.forEach((listener) => listener(user));
    }
    ensureBaseClient() {
        if (!this.baseClient) {
            throw new Error("CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.");
        }
        return this.baseClient;
    }
    ensureSupabase() {
        if (!this.supabase) {
            throw new Error("CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.");
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
        const metadata = user.metadata && typeof user.metadata === "object"
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
    async getUser() {
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
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        const user = await this.ensureBaseClient().signInWithEmail(email, password);
        this.emit(user);
        return user;
    }
    async signInWalletWithBase(provider) {
        var _a;
        if (!this.baseClient) {
            return false;
        }
        await this.baseClient.signIn({
            provider,
            flow: "native",
        });
        const baseUser = await this.safeGetBaseUser();
        if (!baseUser) {
            return true;
        }
        const linkedWallet = (_a = this.hydrateWalletStateFromUser(baseUser)) !== null && _a !== void 0 ? _a : this.toLinkedWalletState(provider, makeWalletAddress());
        this.walletUser = null;
        this.linkedWallet = linkedWallet;
        this.walletSessionToken = linkedWallet.sessionToken;
        this.emit(this.applyLinkedWallet(baseUser));
        return true;
    }
    async signInWalletWithBridge(provider) {
        var _a, _b;
        if (!this.walletBridge) {
            throw new Error(`UNSUPPORTED_FLOW: ${provider} requires wallet bridge configuration.`);
        }
        const result = await this.walletBridge.connect(provider);
        const linkedWallet = this.toLinkedWalletState(provider, result.walletAddress, result.connectedAt, (_a = result.sessionToken) !== null && _a !== void 0 ? _a : null, (_b = result.metadata) !== null && _b !== void 0 ? _b : {});
        const baseUser = await this.safeGetBaseUser();
        if (baseUser) {
            this.walletUser = null;
            this.linkedWallet = linkedWallet;
            this.walletSessionToken = linkedWallet.sessionToken;
            this.emit(this.applyLinkedWallet(baseUser));
            return;
        }
        this.linkedWallet = null;
        this.walletUser = this.getWalletUser(linkedWallet);
        this.walletSessionToken = linkedWallet.sessionToken;
        this.emit(this.walletUser);
    }
    signInWalletWithFallback(provider) {
        if (!this.allowMockWalletFallback) {
            throw new Error(`UNSUPPORTED_FLOW: ${provider} is not configured. Add a wallet bridge or configure provider auth.`);
        }
        const linkedWallet = this.toLinkedWalletState(provider, makeWalletAddress(), new Date().toISOString(), null, {
            previewWallet: true,
        });
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
                flow: (_b = options.flow) !== null && _b !== void 0 ? _b : "native",
                redirectUri: options.redirectUri,
            });
            return;
        }
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
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
            provider: "google",
            flow: "native",
            redirectUri: redirectTo,
        });
    }
    async signUpWithEmail(email, password) {
        this.walletUser = null;
        this.linkedWallet = null;
        this.walletSessionToken = null;
        const supabase = this.ensureSupabase();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) {
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
        const hasSession = Boolean(data.session);
        if (hasSession) {
            this.emit(this.mapSupabaseUser(data.user));
        }
        return {
            needsEmailVerification: !hasSession,
        };
    }
    async signOut() {
        var _a, _b;
        const walletState = (_a = this.linkedWallet) !== null && _a !== void 0 ? _a : (this.walletUser
            ? this.hydrateWalletStateFromUser(this.walletUser)
            : null);
        if (walletState && ((_b = this.walletBridge) === null || _b === void 0 ? void 0 : _b.disconnect)) {
            try {
                await this.walletBridge.disconnect(walletState.provider, walletState.walletAddress);
            }
            catch {
                // Ignore bridge disconnect errors to avoid trapping users in signed-in state.
            }
        }
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
