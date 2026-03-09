import type { AuthCapabilities, AuthClient, AuthRuntime, SignInOptions, User } from "@edcalderon/auth";
declare const WALLET_PROVIDERS: readonly ["metamask", "walletconnect"];
export type WalletProvider = (typeof WALLET_PROVIDERS)[number];
export interface WalletConnectionResult {
    walletAddress: string;
    connectedAt?: string;
    sessionToken?: string | null;
    metadata?: Record<string, unknown>;
}
export interface WalletConnectionBridge {
    connect(provider: WalletProvider): Promise<WalletConnectionResult>;
    disconnect?: (provider: WalletProvider, walletAddress: string) => Promise<void>;
}
export interface AlternunMobileAuthClientOptions {
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseAnonKey?: string;
    walletBridge?: WalletConnectionBridge;
    allowMockWalletFallback?: boolean;
    allowWalletOnlySession?: boolean;
}
export interface EmailSignUpResult {
    needsEmailVerification: boolean;
    emailAlreadyRegistered: boolean;
    confirmationEmailSent: boolean;
}
export declare function isWalletProvider(provider?: string): provider is WalletProvider;
export declare class AlternunMobileAuthClient implements AuthClient {
    runtime: AuthRuntime;
    private baseClient;
    private supabase;
    private listeners;
    private walletUser;
    private linkedWallet;
    private walletSessionToken;
    private unsubscribeBase;
    private walletBridge;
    private allowMockWalletFallback;
    private allowWalletOnlySession;
    constructor(options: AlternunMobileAuthClientOptions);
    capabilities(): AuthCapabilities;
    private emit;
    private ensureBaseClient;
    private ensureSupabase;
    private mapSupabaseUser;
    private applyLinkedWallet;
    private getWalletUser;
    private safeGetBaseUser;
    private toLinkedWalletState;
    private hydrateWalletStateFromUser;
    private buildWalletMetadataPayload;
    private resolveWalletChain;
    private upsertWalletRegistryEntry;
    private persistLinkedWalletOnBaseUser;
    getUser(): Promise<User | null>;
    signInWithEmail(email: string, password: string): Promise<User>;
    private signInWalletWithBase;
    private signInWalletWithBridge;
    private signInWalletWithFallback;
    signIn(options: SignInOptions): Promise<void>;
    signInWithGoogle(redirectTo?: string): Promise<void>;
    signUpWithEmail(email: string, password: string, locale?: string): Promise<EmailSignUpResult>;
    resendEmailConfirmation(email: string): Promise<void>;
    verifyEmailConfirmationCode(email: string, code: string): Promise<void>;
    signOut(): Promise<void>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
    getSessionToken(): Promise<string | null>;
}
export declare function createAlternunMobileAuthClient(options: AlternunMobileAuthClientOptions): AlternunMobileAuthClient;
export declare const SUPPORTED_WALLET_PROVIDERS: readonly ["metamask", "walletconnect"];
export {};
