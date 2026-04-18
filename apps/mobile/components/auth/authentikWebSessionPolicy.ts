// AIRS web still supports an explicit fresh-session relay for experiments, but
// the default direct Authentik source path should not force a logout. For the
// direct `authentik` path, forcing a logout has been replaying stale source-flow
// state and breaking the callback finalize step.
export function shouldForceFreshAuthentikSocialSession(
  platformOs: string,
  socialLoginMode?: string | null,
): boolean {
  return platformOs === 'web' && socialLoginMode?.trim().toLowerCase() === 'hybrid';
}
