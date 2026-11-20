export interface ManageScreenAuthContext {
  client: { getSessionToken(): Promise<string | null> };
}
