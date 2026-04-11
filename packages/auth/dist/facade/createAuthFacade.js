import { resolveAuthRuntimeConfig } from '../runtime/config.js';
import { AlternunMobileAuthClient, } from '../mobile/AlternunMobileAuthClient.js';
import { BetterAuthExecutionProvider } from '../providers/better-auth/BetterAuthExecutionProvider.js';
import { AuthentikIssuerProvider } from '../providers/authentik/AuthentikIssuerProvider.js';
import { SupabaseLegacyIssuerProvider } from '../providers/supabase-legacy/SupabaseLegacyIssuerProvider.js';
import { SupabaseExecutionProvider, } from '../providers/supabase-legacy/SupabaseExecutionProvider.js';
import { SupabaseIdentityRepository } from '../providers/supabase-legacy/SupabaseIdentityRepository.js';
import { PostmarkEmailProvider } from '../providers/email/PostmarkEmailProvider.js';
import { SesEmailProvider } from '../providers/email/SesEmailProvider.js';
import { SupabaseEmailProvider } from '../providers/email/SupabaseEmailProvider.js';
import { upsertOidcUser } from '../compat/upsertOidcUser.js';
import { AlternunAuthFacade } from './AlternunAuthFacade.js';
function resolveRuntimeConfig(input) {
    const { env, ...overrides } = input !== null && input !== void 0 ? input : {};
    return {
        ...resolveAuthRuntimeConfig(env),
        ...overrides,
    };
}
function createIdentityRepository(runtime, options) {
    var _a;
    return ((_a = options.identityRepository) !== null && _a !== void 0 ? _a : new SupabaseIdentityRepository({
        supabaseUrl: runtime.supabaseUrl,
        supabaseKey: runtime.supabaseKey,
        legacyUpsertFn: upsertOidcUser,
    }));
}
function createLegacyExecutionClient(runtime, options) {
    var _a, _b, _c, _d, _e;
    const legacyClient = new AlternunMobileAuthClient({
        supabaseUrl: runtime.supabaseUrl,
        supabaseKey: runtime.supabaseKey,
        supabaseAnonKey: runtime.supabaseAnonKey,
        walletBridge: (_a = options.walletBridge) !== null && _a !== void 0 ? _a : undefined,
        allowMockWalletFallback: (_c = (_b = options.allowMockWalletFallback) !== null && _b !== void 0 ? _b : runtime.allowMockWalletFallback) !== null && _c !== void 0 ? _c : false,
        allowWalletOnlySession: (_e = (_d = options.allowWalletOnlySession) !== null && _d !== void 0 ? _d : runtime.allowWalletOnlySession) !== null && _e !== void 0 ? _e : false,
    });
    return {
        runtime: legacyClient.runtime,
        getUser: legacyClient.getUser.bind(legacyClient),
        signInWithEmail: legacyClient.signInWithEmail.bind(legacyClient),
        signInWithGoogle: legacyClient.signInWithGoogle.bind(legacyClient),
        signIn: legacyClient.signIn.bind(legacyClient),
        signOut: legacyClient.signOut.bind(legacyClient),
        onAuthStateChange: legacyClient.onAuthStateChange.bind(legacyClient),
        getSessionToken: legacyClient.getSessionToken.bind(legacyClient),
        capabilities: legacyClient.capabilities.bind(legacyClient),
        signUpWithEmail: legacyClient.signUpWithEmail.bind(legacyClient),
        resendEmailConfirmation: legacyClient.resendEmailConfirmation.bind(legacyClient),
        verifyEmailConfirmationCode: legacyClient.verifyEmailConfirmationCode.bind(legacyClient),
        setOidcUser: legacyClient.setOidcUser.bind(legacyClient),
        supabase: legacyClient.supabase,
    };
}
function hasLegacyEmailSupport(runtime) {
    var _a;
    return Boolean(runtime.supabaseUrl && ((_a = runtime.supabaseKey) !== null && _a !== void 0 ? _a : runtime.supabaseAnonKey));
}
function createExecutionProvider(runtime, options) {
    var _a;
    if (options.executionProvider) {
        return options.executionProvider;
    }
    const legacyClient = createLegacyExecutionClient(runtime, options);
    if (runtime.executionProvider === 'better-auth') {
        return new BetterAuthExecutionProvider({
            baseUrl: runtime.betterAuthBaseUrl,
            fetchFn: options.fetchFn,
            defaultProvider: 'google',
            walletBridge: (_a = options.walletBridge) !== null && _a !== void 0 ? _a : null,
            emailFallbackClient: hasLegacyEmailSupport(runtime) ? legacyClient : null,
        });
    }
    return new SupabaseExecutionProvider(legacyClient);
}
function createIssuerProvider(runtime, options, identityRepository) {
    if (options.issuerProvider) {
        return options.issuerProvider;
    }
    if (runtime.issuerProvider === 'supabase-legacy') {
        return new SupabaseLegacyIssuerProvider({
            identityRepository,
            issuer: runtime.authentikIssuer,
            clientId: runtime.authentikClientId,
            redirectUri: runtime.authentikRedirectUri,
        });
    }
    return new AuthentikIssuerProvider({
        identityRepository,
        issuer: runtime.authentikIssuer,
        clientId: runtime.authentikClientId,
        redirectUri: runtime.authentikRedirectUri,
        authExchangeUrl: runtime.authExchangeUrl,
        fetchFn: options.fetchFn,
        sessionStorage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    });
}
function createEmailProvider(runtime, options) {
    if (options.emailProvider) {
        return options.emailProvider;
    }
    switch (runtime.emailProvider) {
        case 'postmark':
            return new PostmarkEmailProvider({
                from: runtime.emailFrom,
                senderName: runtime.emailSenderName,
            });
        case 'ses':
            return new SesEmailProvider({
                from: runtime.emailFrom,
                senderName: runtime.emailSenderName,
            });
        default:
            return new SupabaseEmailProvider({
                from: runtime.emailFrom,
                senderName: runtime.emailSenderName,
            });
    }
}
export function createAuthFacade(options = {}) {
    var _a, _b, _c, _d, _e;
    const runtime = resolveRuntimeConfig(options.runtime);
    const identityRepository = createIdentityRepository(runtime, options);
    const executionProvider = createExecutionProvider(runtime, options);
    const issuerProvider = createIssuerProvider(runtime, options, identityRepository);
    const emailProvider = createEmailProvider(runtime, options);
    return new AlternunAuthFacade({
        executionProvider,
        issuerProvider,
        emailProvider,
        identityRepository,
        runtime,
        logger: options.logger,
        walletBridge: (_a = options.walletBridge) !== null && _a !== void 0 ? _a : null,
        allowMockWalletFallback: (_c = (_b = options.allowMockWalletFallback) !== null && _b !== void 0 ? _b : runtime.allowMockWalletFallback) !== null && _c !== void 0 ? _c : false,
        allowWalletOnlySession: (_e = (_d = options.allowWalletOnlySession) !== null && _d !== void 0 ? _d : runtime.allowWalletOnlySession) !== null && _e !== void 0 ? _e : false,
    });
}
