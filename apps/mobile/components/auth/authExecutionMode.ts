import { resolveAuthRuntimeConfig } from '../../../../packages/auth/src/runtime/config';

export function isBetterAuthExecutionEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return resolveAuthRuntimeConfig(env).executionProvider === 'better-auth';
}

export type PrimaryOAuthProviderName = 'google' | 'keycloak';

export function resolvePrimaryOAuthProvider(
  env: Record<string, string | undefined> = process.env
): PrimaryOAuthProviderName {
  if (isBetterAuthExecutionEnabled(env)) {
    return 'google';
  }

  const value = env.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER?.trim().toLowerCase();
  if (value === 'keycloak') {
    return 'keycloak';
  }

  return 'google';
}
