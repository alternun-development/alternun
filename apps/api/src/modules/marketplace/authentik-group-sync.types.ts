export type AuthentikGroupRole = 'partner_operator' | 'sub_admin' | 'partner_readonly';

/**
 * added / removed: Authentik now matches the membership. skipped: nothing was done (the sync is
 * not configured, or the person has no Authentik account to change). failed: Authentik was
 * reached or tried and the change did not happen; the membership in the database stands.
 */
export type AuthentikGroupSyncStatus = 'added' | 'removed' | 'skipped' | 'failed';

export interface AuthentikGroupSync {
  add(email: string, role: AuthentikGroupRole): Promise<AuthentikGroupSyncStatus>;
  remove(email: string, role: AuthentikGroupRole): Promise<AuthentikGroupSyncStatus>;
}

export interface AuthentikGroupSyncDependencies {
  env: Record<string, string | undefined>;
  fetch: (
    url: string,
    init?: Record<string, unknown>
  ) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }>;
}
