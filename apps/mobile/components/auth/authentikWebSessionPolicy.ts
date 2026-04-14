// AIRS web shares the Authentik host with admin/test flows on testnet, so a
// stale SSO session can make Authentik-managed social login apply to the wrong
// user. Force a fresh Authentik session whenever web social login still flows
// through Authentik.
export function shouldForceFreshAuthentikSocialSession(
  platformOs: string,
  socialLoginMode?: string | null
): boolean {
  return platformOs === 'web' && socialLoginMode?.trim().toLowerCase() !== 'supabase';
}
