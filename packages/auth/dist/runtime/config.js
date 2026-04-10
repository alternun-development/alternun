import { parseAuthProviderSelection, parseBooleanLike } from '../validation/providerConfig.js';
export function getProcessEnv() {
    var _a;
    const maybeProcess = globalThis.process;
    return (_a = maybeProcess === null || maybeProcess === void 0 ? void 0 : maybeProcess.env) !== null && _a !== void 0 ? _a : {};
}
function readEnvValue(env, keys, fallback) {
    var _a;
    for (const key of keys) {
        const value = (_a = env[key]) === null || _a === void 0 ? void 0 : _a.trim();
        if (value) {
            return value;
        }
    }
    return fallback;
}
export function resolveAuthRuntime() {
    return typeof window !== 'undefined' && typeof document !== 'undefined' ? 'web' : 'native';
}
export function resolveAuthRuntimeConfig(env = getProcessEnv()) {
    const selection = parseAuthProviderSelection({
        executionProvider: readEnvValue(env, ['AUTH_EXECUTION_PROVIDER']),
        issuerProvider: readEnvValue(env, ['AUTH_ISSUER_PROVIDER']),
        emailProvider: readEnvValue(env, ['AUTH_EMAIL_PROVIDER', 'EMAIL_PROVIDER', 'EMAIL_SMTP_PROVIDER']),
    });
    return {
        runtime: resolveAuthRuntime(),
        executionProvider: selection.executionProvider,
        issuerProvider: selection.issuerProvider,
        emailProvider: selection.emailProvider,
        supabaseUrl: readEnvValue(env, [
            'EXPO_PUBLIC_SUPABASE_URL',
            'EXPO_PUBLIC_SUPABASE_URI',
            'SUPABASE_URL',
        ]),
        supabaseKey: readEnvValue(env, [
            'EXPO_PUBLIC_SUPABASE_KEY',
            'EXPO_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_KEY',
            'SUPABASE_ANON_KEY',
        ]),
        supabaseAnonKey: readEnvValue(env, ['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']),
        authentikIssuer: readEnvValue(env, ['EXPO_PUBLIC_AUTHENTIK_ISSUER', 'AUTHENTIK_ISSUER']),
        authentikClientId: readEnvValue(env, ['EXPO_PUBLIC_AUTHENTIK_CLIENT_ID', 'AUTHENTIK_CLIENT_ID']),
        authentikRedirectUri: readEnvValue(env, [
            'EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI',
            'AUTHENTIK_REDIRECT_URI',
        ]),
        betterAuthBaseUrl: readEnvValue(env, [
            'AUTH_BETTER_AUTH_URL',
            'BETTER_AUTH_URL',
            'EXPO_PUBLIC_BETTER_AUTH_URL',
        ]),
        betterAuthClientId: readEnvValue(env, [
            'AUTH_BETTER_AUTH_CLIENT_ID',
            'BETTER_AUTH_CLIENT_ID',
        ]),
        betterAuthApiKey: readEnvValue(env, ['AUTH_BETTER_AUTH_API_KEY', 'BETTER_AUTH_API_KEY']),
        authExchangeUrl: readEnvValue(env, ['AUTH_EXCHANGE_URL', 'EXPO_PUBLIC_AUTH_EXCHANGE_URL']),
        emailFrom: readEnvValue(env, ['EMAIL_FROM', 'AUTH_EMAIL_FROM']),
        emailSenderName: readEnvValue(env, ['EMAIL_SENDER_NAME', 'AUTH_EMAIL_SENDER_NAME']),
        emailLocale: readEnvValue(env, ['EMAIL_LOCALE', 'AUTH_EMAIL_LOCALE']),
        allowMockWalletFallback: parseBooleanLike(readEnvValue(env, ['EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH', 'ALLOW_MOCK_WALLET_FALLBACK'])),
        allowWalletOnlySession: parseBooleanLike(readEnvValue(env, ['EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH', 'ALLOW_WALLET_ONLY_SESSION'])),
    };
}
export function resolveAuthProviderSelection(env = getProcessEnv()) {
    const config = resolveAuthRuntimeConfig(env);
    return {
        executionProvider: config.executionProvider,
        issuerProvider: config.issuerProvider,
        emailProvider: config.emailProvider,
    };
}
