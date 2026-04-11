// AIRS web shares the Authentik host with admin/test flows on testnet, so a
// stale SSO session can make legacy Authentik source-login flows apply to the
// wrong user. Better Auth should not detour through Authentik logout first.
export function shouldForceFreshAuthentikSocialSession(
  platformOs: string,
  executionProvider?: string | null
): boolean {
  return platformOs === 'web' && executionProvider !== 'better-auth';
}
