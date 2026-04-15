import type { AuthCapabilities, AuthClient, AuthRuntime, SignInOptions, User } from '@edcalderon/auth';
import type { AlternunSession, AuthExecutionResult, ExecutionSession, IssuerSession } from '../core/types';
import type { CreateAuthFacadeInput } from '../core/contracts';
export interface AlternunAuthFacadeCompat extends AuthClient {
    signUpWithEmail(email: string, password: string, locale?: string): Promise<AuthExecutionResult>;
    resendEmailConfirmation(email: string): Promise<void>;
    verifyEmailConfirmationCode(email: string, code: string): Promise<void>;
    setOidcUser(user: User | null): void;
    getExecutionSession(): Promise<ExecutionSession | null>;
    refreshExecutionSession(): Promise<ExecutionSession | null>;
    getIssuerSession(): Promise<IssuerSession | null>;
    refreshIssuerSession(): Promise<IssuerSession | null>;
    logoutIssuerSession(options?: {
        reason?: string;
        redirectTo?: string | null;
    }): Promise<void>;
    getAlternunSession(): Promise<AlternunSession | null>;
    readonly supabase?: unknown;
}
export declare class AlternunAuthFacade implements AlternunAuthFacadeCompat {
    private readonly options;
    runtime: AuthRuntime;
    private currentUser;
    private currentCompatUser;
    private currentExecutionSession;
    private currentIssuerSession;
    private currentAlternunSession;
    private lastExchangeKey;
    private providerUnsubscribe;
    private listeners;
    constructor(options: CreateAuthFacadeInput);
    private get executionProvider();
    private get issuerProvider();
    private get emailProvider();
    private get identityRepository();
    get supabase(): unknown;
    capabilities(): AuthCapabilities;
    private log;
    private emit;
    private attachExecutionSubscription;
    private detachExecutionSubscription;
    private safeGetExecutionSession;
    private safeGetIssuerSession;
    private safeExchangeIdentity;
    private buildUserFromAlternunSession;
    private refreshState;
    getUser(): Promise<User | null>;
    signInWithEmail(email: string, password: string): Promise<User>;
    signInWithGoogle(redirectTo?: string): Promise<void>;
    signIn(options: SignInOptions): Promise<void>;
    signUpWithEmail(email: string, password: string, locale?: string): Promise<AuthExecutionResult>;
    resendEmailConfirmation(email: string): Promise<void>;
    verifyEmailConfirmationCode(email: string, code: string): Promise<void>;
    signOut(): Promise<void>;
    getExecutionSession(): Promise<ExecutionSession | null>;
    refreshExecutionSession(): Promise<ExecutionSession | null>;
    getIssuerSession(): Promise<IssuerSession | null>;
    refreshIssuerSession(): Promise<IssuerSession | null>;
    logoutIssuerSession(options?: {
        reason?: string;
        redirectTo?: string | null;
    }): Promise<void>;
    getAlternunSession(): Promise<AlternunSession | null>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
    setOidcUser(user: User | null): void;
    getSessionToken(): Promise<string | null>;
}
