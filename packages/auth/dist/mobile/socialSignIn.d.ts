import type { AuthClient, AuthRuntime } from '@edcalderon/auth';
import type { AuthentikLoginStrategy, AuthentikRelayProvider, AuthentikRelayRoute } from './authEntry';
import { clearPendingAuthentikOAuthProvider, readPendingAuthentikOAuthProvider } from './authentikClient';
import { nativeSignIn, webRedirectSignIn } from './runtimeSignIn';
export type SocialSignInOutcome = 'relay' | 'authentik' | 'supabase' | 'better-auth' | 'native';
export interface SocialSignInDependencies {
    resolveRuntime?: () => AuthRuntime;
    shouldUseRelayEntry?: () => boolean;
    webRedirectSignIn?: typeof webRedirectSignIn;
    nativeSignIn?: typeof nativeSignIn;
}
export interface StartSocialSignInOptions {
    client: AuthClient;
    provider: string;
    authentikProviderHint: AuthentikRelayProvider;
    redirectTo?: string | null;
    forceFreshSession?: boolean;
    strategy?: AuthentikLoginStrategy;
    onRelayRoute?: (route: AuthentikRelayRoute) => void | Promise<void>;
    dependencies?: SocialSignInDependencies;
}
export interface ResumePendingSocialSignInOptions extends Omit<StartSocialSignInOptions, 'provider' | 'authentikProviderHint' | 'forceFreshSession'> {
    forceFreshSession?: boolean;
    resolveProvider?: (provider: AuthentikRelayProvider) => string;
    readPendingProvider?: typeof readPendingAuthentikOAuthProvider;
    clearPendingProvider?: typeof clearPendingAuthentikOAuthProvider;
}
export declare function startSocialSignIn({ client, provider, authentikProviderHint, redirectTo, forceFreshSession, strategy, onRelayRoute, dependencies, }: StartSocialSignInOptions): Promise<SocialSignInOutcome>;
export declare function resumePendingSocialSignIn({ client, redirectTo, forceFreshSession, strategy, onRelayRoute, dependencies, resolveProvider, readPendingProvider, clearPendingProvider, }: ResumePendingSocialSignInOptions): Promise<SocialSignInOutcome | null>;
