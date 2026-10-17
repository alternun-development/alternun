export interface MarketplaceAuthContext {
  user: unknown;
  client: { getSessionToken(): Promise<string | null> };
}
