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
    getUser(): Promise<User | null>;
    signInWithEmail(email: string, password: string): Promise<User>;
    private signInWalletWithBase;
    private signInWalletWithBridge;
    private signInWalletWithFallback;
    signIn(options: SignInOptions): Promise<void>;
    signInWithGoogle(redirectTo?: string): Promise<void>;
    signUpWithEmail(email: string, password: string): Promise<{
        needsEmailVerification: boolean;
    }>;
    signOut(): Promise<void>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
    getSessionToken(): Promise<string | null>;
}
export declare function createAlternunMobileAuthClient(options: AlternunMobileAuthClientOptions): AlternunMobileAuthClient;
export declare const SUPPORTED_WALLET_PROVIDERS: readonly ["metamask", "walletconnect"];
export {};
