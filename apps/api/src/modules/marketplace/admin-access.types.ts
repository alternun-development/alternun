export const GLOBAL_ADMIN_ROLES = ['platform_owner', 'internal_admin'] as const;

export interface AdminAccessScope {
  role: string;
  enterpriseId: string;
  enterpriseSlug: string | null;
  projectId: string | null;
  projectSlug: string | null;
}

/** What the signed-in Airs user may open in the admin panel; used only to show entry points. */
export interface AdminAccess {
  /** Alternun global role (platform_owner | internal_admin), or null. */
  globalRole: string | null;
  isGlobalAdmin: boolean;
  /** Per-project and per-enterprise roles from active memberships. */
  scopes: AdminAccessScope[];
  /** Every distinct role, global and scoped. */
  roles: string[];
}

export interface AdminAccessRepositoryPort {
  findVerifiedEmail(userId: string): Promise<string | null>;
  findGlobalRole(email: string): Promise<string | null>;
  listActiveMemberships(userId: string): Promise<AdminAccessScope[]>;
}
