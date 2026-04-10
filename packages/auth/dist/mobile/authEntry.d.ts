export type AuthentikLoginEntryMode = 'relay' | 'source';
export type AuthentikSocialLoginMode = 'authentik' | 'hybrid' | 'supabase';
export type AuthentikRelayProvider = 'google' | 'discord';
export type AuthentikProviderFlowSlugs = Partial<Record<AuthentikRelayProvider, string>>;
export interface AuthentikLoginStrategy {
    mode: AuthentikLoginEntryMode;
    socialMode: AuthentikSocialLoginMode;
    providerFlowSlugs: AuthentikProviderFlowSlugs;
}
export interface ResolveAuthentikLoginStrategyOptions {
    hostname?: string | null;
    entryMode?: string | undefined | null;
    socialMode?: string | undefined | null;
    providerFlowSlugsValue?: string | undefined | null;
    allowCustomProviderFlowSlugs?: boolean | string | undefined | null;
}
export declare function parseAuthentikProviderFlowSlugs(value: string | undefined | null): AuthentikProviderFlowSlugs;
export declare function resolveAuthentikProviderFlowSlugs(options?: {
    hostname?: string | null;
    value?: string | undefined | null;
    allowCustomProviderFlowSlugs?: boolean | string | undefined | null;
}): AuthentikProviderFlowSlugs;
export declare function normalizeAuthentikLoginEntryMode(value: string | undefined | null): AuthentikLoginEntryMode;
export declare function normalizeAuthentikSocialLoginMode(value: string | undefined | null): AuthentikSocialLoginMode;
export declare function getAuthentikLoginEntryMode(): AuthentikLoginEntryMode;
export declare function getAuthentikSocialLoginMode(): AuthentikSocialLoginMode;
export declare function shouldUseAuthentikRelayEntry(): boolean;
export declare function resolveAuthentikLoginStrategy(options?: ResolveAuthentikLoginStrategyOptions): AuthentikLoginStrategy;
export interface AuthentikRelayRoute {
    pathname: '/auth-relay';
    params: {
        provider: AuthentikRelayProvider;
        fresh: '0' | '1';
        next?: string;
    };
}
export declare function buildAuthentikRelayPath(providerHint: AuthentikRelayProvider, options?: {
    next?: string;
    forceFreshSession?: boolean;
}): string;
export declare function buildAuthentikRelayRoute(providerHint: AuthentikRelayProvider, options?: {
    next?: string;
    forceFreshSession?: boolean;
}): AuthentikRelayRoute;
