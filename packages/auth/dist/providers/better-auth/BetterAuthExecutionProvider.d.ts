import type { AuthCapabilities, AuthRuntime, SignInOptions, User } from '@edcalderon/auth';
import type { AuthExecutionResult, AuthExecutionSignInOptions, AuthExecutionSignUpInput, AuthLinkProviderInput, AuthUnlinkProviderInput, ExecutionSession, LinkedAuthAccount, WalletConnectionBridge } from '../../core/types';
import type { AuthExecutionProvider } from '../../core/contracts';
import { type LegacyExecutionClientLike } from '../supabase-legacy/SupabaseExecutionProvider';
export interface BetterAuthClientLike {
    runtime?: AuthRuntime;
    signIn?(options: SignInOptions & Record<string, unknown>): Promise<unknown>;
    signUp?(input: AuthExecutionSignUpInput & Record<string, unknown>): Promise<unknown>;
    signOut?(): Promise<void>;
    getSession?(): Promise<unknown>;
    refreshSession?(): Promise<unknown>;
    linkProvider?(input: AuthLinkProviderInput): Promise<unknown>;
    unlinkProvider?(input: AuthUnlinkProviderInput): Promise<unknown>;
    getUser?(): Promise<User | null>;
    getSessionToken?(): Promise<string | null>;
}
export interface BetterAuthExecutionProviderOptions {
    client?: BetterAuthClientLike | null;
    baseUrl?: string;
    fetchFn?: typeof fetch;
    emailFallbackClient?: LegacyExecutionClientLike | null;
    allowLegacySessionFallback?: boolean;
    signInPath?: string;
    signUpPath?: string;
    signOutPath?: string;
    sessionPath?: string;
    refreshPath?: string;
    linkPath?: string;
    unlinkPath?: string;
    walletBridge?: WalletConnectionBridge | null;
    defaultProvider?: string;
}
export declare class BetterAuthExecutionProvider implements AuthExecutionProvider {
    private readonly options;
    readonly name: "better-auth";
    private readonly emailFallbackProvider;
    private readonly allowLegacySessionFallback;
    constructor(options: BetterAuthExecutionProviderOptions);
    private get client();
    private get fetchFn();
    private normalizeProvider;
    private getFallbackExecutionSession;
    private requireBaseUrl;
    signIn(options: AuthExecutionSignInOptions): Promise<AuthExecutionResult>;
    signUp(input: AuthExecutionSignUpInput): Promise<AuthExecutionResult>;
    signOut(): Promise<void>;
    getExecutionSession(): Promise<ExecutionSession | null>;
    refreshExecutionSession(): Promise<ExecutionSession | null>;
    linkProvider(input: AuthLinkProviderInput): Promise<LinkedAuthAccount | null>;
    unlinkProvider(input: AuthUnlinkProviderInput): Promise<void>;
    signInWithEmail(email: string, password: string): Promise<User>;
    signUpWithEmail(email: string, password: string, locale?: string): Promise<AuthExecutionResult>;
    resendEmailConfirmation(email: string): Promise<void>;
    verifyEmailConfirmationCode(email: string, code: string): Promise<void>;
    signInWithGoogle(redirectTo?: string): Promise<void>;
    capabilities(): AuthCapabilities;
    getUser(): Promise<User | null>;
    getSessionToken(): Promise<string | null>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
}
export type { AuthCapabilities, AuthClient, OAuthFlow, SignInOptions, User, } from '@edcalderon/auth';
