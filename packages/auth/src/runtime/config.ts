import type { AuthRuntimeConfig } from '../core/types';
import { parseAuthProviderSelection, parseBooleanLike } from '../validation/providerConfig';

export function getProcessEnv(): Record<string, string | undefined> {
  const maybeProcess = globalThis.process;
  return maybeProcess?.env ?? {};
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

export function resolveAuthRuntime(): 'web' | 'native' {
  return typeof window !== 'undefined' && typeof document !== 'undefined' ? 'web' : 'native';
}

export function resolveAuthRuntimeConfig(
  env: Record<string, string | undefined> = getProcessEnv()
): AuthRuntimeConfig {
  const selection = parseAuthProviderSelection({
    executionProvider: readEnvValue(env, ['AUTH_EXECUTION_PROVIDER']),
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
    betterAuthBaseUrl: readEnvValue(env, [
      'AUTH_BETTER_AUTH_URL',
      'BETTER_AUTH_URL',
      'EXPO_PUBLIC_BETTER_AUTH_URL',
    ]),
    betterAuthClientId: readEnvValue(env, ['AUTH_BETTER_AUTH_CLIENT_ID', 'BETTER_AUTH_CLIENT_ID']),
    betterAuthApiKey: readEnvValue(env, ['AUTH_BETTER_AUTH_API_KEY', 'BETTER_AUTH_API_KEY']),
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
