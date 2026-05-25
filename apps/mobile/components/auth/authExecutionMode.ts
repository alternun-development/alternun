import {
  getProcessEnv,
  resolveAuthRuntimeConfig,
} from '../../../../packages/auth/src/runtime/config';

function resolveRuntimeEnv(
  env?: Record<string, string | undefined>
): Record<string, string | undefined> {
  return env ?? getProcessEnv();
}

function resolveRuntimeAuthExecutionProvider(
  env?: Record<string, string | undefined>
): 'better-auth' | 'supabase' {
  return resolveAuthRuntimeConfig(resolveRuntimeEnv(env)).executionProvider;
}

export function isBetterAuthExecutionEnabled(env?: Record<string, string | undefined>): boolean {
  return resolveRuntimeAuthExecutionProvider(env) === 'better-auth';
}

export type PrimaryOAuthProviderName = 'google' | 'keycloak';

export function resolvePrimaryOAuthProvider(
  env?: Record<string, string | undefined>
): PrimaryOAuthProviderName {
  const runtimeEnv = resolveRuntimeEnv(env);

  if (isBetterAuthExecutionEnabled(runtimeEnv)) {
    return 'google';
  }

  const value = runtimeEnv.EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER?.trim().toLowerCase();
  if (value === 'keycloak') {
    return 'keycloak';
  }

  return 'google';
}

export function isSocialAuthEnabled(env?: Record<string, string | undefined>): boolean {
  // Better Auth execution is the real switch for the social buttons.
  // A stale feature flag should not hide the testnet flow.
  return isBetterAuthExecutionEnabled(env);
}
