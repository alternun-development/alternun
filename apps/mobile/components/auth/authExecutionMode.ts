export function isBetterAuthExecutionEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const value = env.EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER ?? env.AUTH_EXECUTION_PROVIDER;
  return value?.trim().toLowerCase() === 'better-auth';
}
