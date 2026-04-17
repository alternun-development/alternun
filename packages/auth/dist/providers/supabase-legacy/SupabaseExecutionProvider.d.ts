import type { AuthCapabilities, AuthClient, User } from '@edcalderon/auth';
import type { AuthExecutionResult, AuthExecutionSignInOptions, AuthExecutionSignUpInput, AuthLinkProviderInput, AuthUnlinkProviderInput, ExecutionSession, LinkedAuthAccount, WalletConnectionBridge } from '../../core/types';
import type { AuthExecutionProvider } from '../../core/contracts';
export interface LegacyExecutionClientLike extends AuthClient {
    signInWithEmail(email: string, password: string): Promise<User>;
    signUpWithEmail?(email: string, password: string, locale?: string): Promise<unknown>;
    resendEmailConfirmation?(email: string): Promise<void>;
    verifyEmailConfirmationCode?(email: string, code: string): Promise<void>;
    setOidcUser?(user: User | null): void;
    supabase?: unknown;
}
export interface SupabaseExecutionProviderOptions {
    client: LegacyExecutionClientLike;
    walletBridge?: WalletConnectionBridge | null;
}
export declare class SupabaseExecutionProvider implements AuthExecutionProvider {
    private readonly client;
    readonly name: "supabase";
    constructor(client: LegacyExecutionClientLike);
    signIn(options: AuthExecutionSignInOptions): Promise<AuthExecutionResult>;
    signUp(input: AuthExecutionSignUpInput): Promise<AuthExecutionResult>;
    signOut(): Promise<void>;
    getExecutionSession(): Promise<ExecutionSession | null>;
    refreshExecutionSession(): Promise<ExecutionSession | null>;
    linkProvider(input: AuthLinkProviderInput): Promise<LinkedAuthAccount | null>;
    unlinkProvider(input: AuthUnlinkProviderInput): Promise<void>;
    signInWithEmail(email: string, password: string): Promise<User>;
    signUpWithEmail(email: string, password: string, locale?: string): Promise<unknown>;
    resendEmailConfirmation(email: string): Promise<void>;
    verifyEmailConfirmationCode(email: string, code: string): Promise<void>;
    signInWithGoogle(redirectTo?: string): Promise<void>;
    capabilities(): AuthCapabilities;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
    get supabase(): LegacyExecutionClientLike['supabase'];
    get runtime(): import("@edcalderon/auth").AuthRuntime;
    getUser(): Promise<User | null>;
    getSessionToken(): Promise<string | null>;
}
export type { AuthCapabilities, AuthClient, OAuthFlow, SignInOptions, User, } from '@edcalderon/auth';
