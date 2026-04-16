import type { AuthExecutionProviderName, AuthRuntimeConfig } from '../core/types';
import { parseAuthProviderSelection, parseBooleanLike } from '../validation/providerConfig';

export function getProcessEnv(): Record<string, string | undefined> {
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

function readEnvValue(
  env: Record<string, string | undefined>,
  keys: string[],
  fallback?: string
): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return fallback;
}

function normalizeBetterAuthBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const normalizedPath = url.pathname
      .replace(/\/+$/, '')
      .replace(/\/auth\/exchange$/, '')
      .replace(/\/auth$/, '');
    url.pathname = normalizedPath || '/';
    url.search = '';
    url.hash = '';

    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`.replace(/\/+$/, '');
  } catch {
    return trimmed
      .replace(/\?.*$/, '')
      .replace(/#.*$/, '')
      .replace(/\/+$/, '')
      .replace(/\/auth\/exchange$/, '')
      .replace(/\/auth$/, '');
  }
}

export function resolveBetterAuthBaseUrl(
  env: Record<string, string | undefined>
): string | undefined {
  const value = readEnvValue(env, [
    'AUTH_BETTER_AUTH_URL',
    'BETTER_AUTH_URL',
    'EXPO_PUBLIC_BETTER_AUTH_URL',
    'AUTH_EXCHANGE_URL',
    'EXPO_PUBLIC_AUTH_EXCHANGE_URL',
  ]);

  return value ? normalizeBetterAuthBaseUrl(value) : undefined;
}

function resolveExecutionProvider(
  env: Record<string, string | undefined>
): AuthExecutionProviderName {
  const explicit = readEnvValue(env, [
    'AUTH_EXECUTION_PROVIDER',
    'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER',
  ]);
  const normalized = explicit?.trim().toLowerCase();

  if (normalized === 'better-auth' || normalized === 'supabase') {
    return normalized;
  }

  const betterAuthBaseUrl = resolveBetterAuthBaseUrl(env);

  return betterAuthBaseUrl ? 'better-auth' : 'supabase';
}

export function resolveAuthRuntime(): 'web' | 'native' {
  return typeof window !== 'undefined' && typeof document !== 'undefined' ? 'web' : 'native';
}

export function resolveAuthRuntimeConfig(
  env: Record<string, string | undefined> = getProcessEnv()
): AuthRuntimeConfig {
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
    allowMockWalletFallback: parseBooleanLike(
      readEnvValue(env, ['EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH', 'ALLOW_MOCK_WALLET_FALLBACK'])
    ),
    allowWalletOnlySession: parseBooleanLike(
      readEnvValue(env, ['EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH', 'ALLOW_WALLET_ONLY_SESSION'])
    ),
  };
}

export function resolveAuthProviderSelection(
  env: Record<string, string | undefined> = getProcessEnv()
): Pick<AuthRuntimeConfig, 'executionProvider' | 'issuerProvider' | 'emailProvider'> {
  const config = resolveAuthRuntimeConfig(env);
  return {
    executionProvider: config.executionProvider,
    issuerProvider: config.issuerProvider,
    emailProvider: config.emailProvider,
  };
}
