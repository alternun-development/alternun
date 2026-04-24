import { parseAuthProviderSelection, parseBooleanLike } from '../validation/providerConfig.js';
export function getProcessEnv() {
    return {
        AUTH_EXECUTION_PROVIDER: process.env.AUTH_EXECUTION_PROVIDER,
        EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: process.env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER,
        AUTH_ISSUER_PROVIDER: process.env.AUTH_ISSUER_PROVIDER,
        AUTH_EMAIL_PROVIDER: process.env.AUTH_EMAIL_PROVIDER,
        EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
        EMAIL_SMTP_PROVIDER: process.env.EMAIL_SMTP_PROVIDER,
        EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_URI: process.env.EXPO_PUBLIC_SUPABASE_URI,
        SUPABASE_URL: process.env.SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_KEY: process.env.SUPABASE_KEY,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
        EXPO_PUBLIC_AUTHENTIK_ISSUER: process.env.EXPO_PUBLIC_AUTHENTIK_ISSUER,
        AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
        EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID,
        AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID,
        EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: process.env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI,
        AUTHENTIK_REDIRECT_URI: process.env.AUTHENTIK_REDIRECT_URI,
        AUTH_BETTER_AUTH_URL: process.env.AUTH_BETTER_AUTH_URL,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        EXPO_PUBLIC_BETTER_AUTH_URL: process.env.EXPO_PUBLIC_BETTER_AUTH_URL,
        AUTH_BETTER_AUTH_CLIENT_ID: process.env.AUTH_BETTER_AUTH_CLIENT_ID,
        BETTER_AUTH_CLIENT_ID: process.env.BETTER_AUTH_CLIENT_ID,
        AUTH_EXCHANGE_URL: process.env.AUTH_EXCHANGE_URL,
        EXPO_PUBLIC_AUTH_EXCHANGE_URL: process.env.EXPO_PUBLIC_AUTH_EXCHANGE_URL,
        EMAIL_FROM: process.env.EMAIL_FROM,
        AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
        EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME,
        AUTH_EMAIL_SENDER_NAME: process.env.AUTH_EMAIL_SENDER_NAME,
        EMAIL_LOCALE: process.env.EMAIL_LOCALE,
        AUTH_EMAIL_LOCALE: process.env.AUTH_EMAIL_LOCALE,
        EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH: process.env.EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH,
        ALLOW_MOCK_WALLET_FALLBACK: process.env.ALLOW_MOCK_WALLET_FALLBACK,
        EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH: process.env.EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH,
        ALLOW_WALLET_ONLY_SESSION: process.env.ALLOW_WALLET_ONLY_SESSION,
    };
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
function stripTrailingSlashes(value) {
    let result = value;
    while (result.endsWith('/')) {
        result = result.slice(0, -1);
    }
    return result;
}
function stripSuffix(value, suffix) {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}
function stripQueryAndFragment(value) {
    const queryIndex = value.indexOf('?');
    const hashIndex = value.indexOf('#');
    let endIndex = value.length;
    if (queryIndex >= 0) {
        endIndex = Math.min(endIndex, queryIndex);
    }
    if (hashIndex >= 0) {
        endIndex = Math.min(endIndex, hashIndex);
    }
    return value.slice(0, endIndex);
}
function normalizeBetterAuthBaseUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }
    try {
        const url = new URL(trimmed);
        const normalizedPath = stripSuffix(stripSuffix(stripTrailingSlashes(url.pathname), '/auth/exchange'), '/auth');
        url.pathname = normalizedPath || '/';
        url.search = '';
        url.hash = '';
        return stripTrailingSlashes(`${url.origin}${url.pathname === '/' ? '' : url.pathname}`);
    }
    catch {
        return stripSuffix(stripSuffix(stripTrailingSlashes(stripQueryAndFragment(trimmed)), '/auth/exchange'), '/auth');
    }
}
export function resolveBetterAuthBaseUrl(env) {
    const value = readEnvValue(env, [
        'AUTH_BETTER_AUTH_URL',
        'BETTER_AUTH_URL',
        'EXPO_PUBLIC_BETTER_AUTH_URL',
        'AUTH_EXCHANGE_URL',
        'EXPO_PUBLIC_AUTH_EXCHANGE_URL',
    ]);
    return value ? normalizeBetterAuthBaseUrl(value) : undefined;
}
function resolveExecutionProvider(env) {
    const explicit = readEnvValue(env, [
        'AUTH_EXECUTION_PROVIDER',
        'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER',
    ]);
    const normalized = explicit === null || explicit === void 0 ? void 0 : explicit.trim().toLowerCase();
    if (normalized === 'better-auth' || normalized === 'supabase') {
        return normalized;
    }
    const betterAuthBaseUrl = resolveBetterAuthBaseUrl(env);
    return betterAuthBaseUrl ? 'better-auth' : 'supabase';
}
export function resolveAuthRuntime() {
    return typeof window !== 'undefined' && typeof document !== 'undefined' ? 'web' : 'native';
}
export function resolveAuthRuntimeConfig(env = getProcessEnv()) {
    const selection = parseAuthProviderSelection({
        executionProvider: resolveExecutionProvider(env),
        issuerProvider: readEnvValue(env, ['AUTH_ISSUER_PROVIDER']),
        emailProvider: readEnvValue(env, [
            'AUTH_EMAIL_PROVIDER',
            'EMAIL_PROVIDER',
            'EMAIL_SMTP_PROVIDER',
        ]),
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
        authentikClientId: readEnvValue(env, [
            'EXPO_PUBLIC_AUTHENTIK_CLIENT_ID',
            'AUTHENTIK_CLIENT_ID',
        ]),
        authentikRedirectUri: readEnvValue(env, [
            'EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI',
            'AUTHENTIK_REDIRECT_URI',
        ]),
        betterAuthBaseUrl: resolveBetterAuthBaseUrl(env),
        betterAuthClientId: readEnvValue(env, ['AUTH_BETTER_AUTH_CLIENT_ID', 'BETTER_AUTH_CLIENT_ID']),
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
