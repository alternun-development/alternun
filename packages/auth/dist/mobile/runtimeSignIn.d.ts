import type { AuthClient, AuthRuntime } from '@edcalderon/auth';
import type { OidcProvider } from './authentikClient';
import type { AuthentikLoginStrategy } from './authEntry';
export interface WebRedirectSignInOptions {
    client: AuthClient;
    provider: string;
    redirectTo?: string | null;
    authentikProviderHint?: OidcProvider;
    forceFreshSession?: boolean;
    strategy?: AuthentikLoginStrategy;
}
export interface NativeSignInOptions {
    client: AuthClient;
    provider: string;
    redirectUri?: string | null;
}
export declare function resolveAuthRuntime(): AuthRuntime;
export declare function resolveAuthReturnTo(target: string | null | undefined): string;
export declare function storeAuthReturnTo(target: string | null | undefined): string;
export declare function readAuthReturnTo(): string | null;
export declare function clearAuthReturnTo(): void;
export declare function getAuthentikWebCallbackUrl(): string;
export declare function webRedirectSignIn({ client, provider, redirectTo, authentikProviderHint, forceFreshSession, strategy, }: WebRedirectSignInOptions): Promise<'authentik' | 'supabase'>;
export declare function nativeSignIn({ client, provider, redirectUri, }: NativeSignInOptions): Promise<void>;
