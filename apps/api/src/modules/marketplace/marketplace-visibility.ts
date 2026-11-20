/**
 * Production shows only the catalog approved for launch: projects and enterprises flagged
 * `testnet_only` stay off its public pages. Testnet and local show everything. Admin views are
 * never filtered.
 */
export function hidesTestnetOnly(env: Record<string, string | undefined> = process.env): boolean {
  return env.APP_STAGE?.trim().toLowerCase() === 'production';
}
