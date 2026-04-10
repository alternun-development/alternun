// AIRS web shares the Authentik host with admin/test flows on testnet, so a
// stale SSO session can make source-login flows apply to the wrong user.
export function shouldForceFreshAuthentikSocialSession(platformOs: string,): boolean {
  return platformOs === 'web';
}
