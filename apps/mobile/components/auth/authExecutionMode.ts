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

export function isSocialAuthEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  // Better Auth execution is the real switch for the social buttons.
  // A stale feature flag should not hide the testnet flow.
  return isBetterAuthExecutionEnabled(env);
}
