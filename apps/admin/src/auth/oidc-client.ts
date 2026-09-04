import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from 'oidc-client-ts';
import { adminEnv } from '../config/env';
import { internalAdminResourceNames, partnerAdminResourceNames } from '../resources/catalog';

type ClaimBag = Record<string, unknown>;

export const ADMIN_ROLES = [
  'platform_owner',
  'internal_admin',
  'partner_operator',
  'partner_readonly',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminSurface = 'internal' | 'partner';

type AdminAccessProfile = {
  allowedResources: string[];
  organizationIds: string[];
  primaryRole: AdminRole;
  roles: AdminRole[];
  surface: AdminSurface;
};

const knownAdminRoles = new Set<string>(ADMIN_ROLES);
const ADMIN_GROUP_ROLE_ALIASES: Map<string, AdminRole> = new Map([
  ['authentik admins', 'platform_owner'],
  ['alternun dashboard admins', 'internal_admin'],
  ['alternun internal admin', 'internal_admin'],
  ['alternun platform owner', 'platform_owner'],
  ['alternun partner operator', 'partner_operator'],
  ['alternun partner read only', 'partner_readonly'],
]);
const rolePriority: readonly AdminRole[] = [
  'platform_owner',
  'internal_admin',
  'partner_operator',
  'partner_readonly',
] as const;

function createSettings(): UserManagerSettings {
  const origin = typeof window === 'undefined' ? 'http://localhost:4173' : window.location.origin;

  return {
    authority: adminEnv.authIssuer,
    client_id: adminEnv.authClientId,
    redirect_uri: `${origin}/auth/callback`,
    post_logout_redirect_uri: `${origin}/login`,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    automaticSilentRenew: true,
    monitorSession: false,
    loadUserInfo: false,
    userStore:
      typeof window === 'undefined'
        ? undefined
        : new WebStorageStateStore({ store: window.localStorage }),
    extraQueryParams: adminEnv.authAudience
      ? {
          audience: adminEnv.authAudience,
        }
      : undefined,
  };
}

export const oidcClient = new UserManager(createSettings());

export async function getActiveAdminSession(): Promise<User | null> {
  const user = await oidcClient.getUser();
  if (!user || user.expired) {
    return null;
  }

  return user;
}

export async function getAccessToken(): Promise<string | null> {
  const user = await getActiveAdminSession();
  return user?.access_token ?? null;
}

function readClaimArray(claims: ClaimBag, key: string): string[] {
  const value = claims[key];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string' && value.length > 0) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function copyResourceNames(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function normalizeAdminRole(value: string): AdminRole | null {
  const normalizedValue = value.trim();
  return knownAdminRoles.has(normalizedValue) ? (normalizedValue as AdminRole) : null;
}

function readCanonicalAdminRoles(claims: ClaimBag): AdminRole[] {
  const roles = new Set<AdminRole>();
  const roleClaims = [
    ...readClaimArray(claims, 'roles'),
    ...readClaimArray(claims, 'alternun_roles'),
    ...readClaimArray(claims, 'role'),
  ];

  for (const roleClaim of roleClaims) {
    const role = normalizeAdminRole(roleClaim);
    if (role) {
      roles.add(role);
    }
  }

  for (const group of readClaimArray(claims, 'groups')) {
    const aliasedRole = ADMIN_GROUP_ROLE_ALIASES.get(group.trim().toLowerCase());
    if (aliasedRole) {
      roles.add(aliasedRole);
    }
  }

  return rolePriority.filter((role) => roles.has(role));
}

export function getAdminOrganizationIdsFromSession(user: User | null): string[] {
  if (!user) {
    return [];
  }

  const claims = user.profile as ClaimBag;
  return Array.from(
    new Set([
      ...readClaimArray(claims, 'organization_ids'),
      ...readClaimArray(claims, 'alternun_organization_ids'),
      ...readClaimArray(claims, 'organizationIds'),
      ...readClaimArray(claims, 'org_ids'),
      ...readClaimArray(claims, 'org_id'),
    ])
  );
}

export function getAdminRolesFromSession(user: User | null): AdminRole[] {
  if (!user) {
    return [];
  }

  return readCanonicalAdminRoles(user.profile as ClaimBag);
}

export function resolveAdminAccessProfile(
  roles: readonly AdminRole[],
  organizationIds: readonly string[] = []
): AdminAccessProfile | null {
  const canonicalRoles = rolePriority.filter((role) => roles.includes(role));
  if (canonicalRoles.length === 0) {
    return null;
  }

  const primaryRole = canonicalRoles[0];
  const surface: AdminSurface =
    primaryRole === 'platform_owner' || primaryRole === 'internal_admin' ? 'internal' : 'partner';

  return {
    allowedResources:
      surface === 'internal'
        ? copyResourceNames(internalAdminResourceNames)
        : copyResourceNames(partnerAdminResourceNames),
    organizationIds: copyResourceNames(organizationIds),
    primaryRole,
    roles: canonicalRoles,
    surface,
  };
}

export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.some((role) => knownAdminRoles.has(role));
}

export function canAccessAdminDashboard(user: User | null): boolean {
  return (
    resolveAdminAccessProfile(
      getAdminRolesFromSession(user),
      getAdminOrganizationIdsFromSession(user)
    ) !== null
  );
}

export function extractAdminIdentity(user: User | null): {
  id: string;
  surface: AdminSurface;
  email?: string;
  fullName?: string;
  name: string;
  organizationIds: string[];
  allowedResources: string[];
  primaryRole: AdminRole;
  roles: AdminRole[];
} | null {
  if (!user) {
    return null;
  }

  const claims = user.profile as ClaimBag;
  const roles = getAdminRolesFromSession(user);
  const organizationIds = getAdminOrganizationIdsFromSession(user);
  const accessProfile = resolveAdminAccessProfile(roles, organizationIds);
  if (!accessProfile) {
    return null;
  }

  const fullName =
    typeof claims.name === 'string'
      ? claims.name
      : typeof claims.preferred_username === 'string'
      ? claims.preferred_username
      : typeof claims.email === 'string'
      ? claims.email
      : 'Alternun Admin';

  return {
    id: typeof claims.sub === 'string' ? claims.sub : user.profile.sub,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    fullName,
    name: fullName,
    surface: accessProfile.surface,
    organizationIds: accessProfile.organizationIds,
    allowedResources: accessProfile.allowedResources,
    primaryRole: accessProfile.primaryRole,
    roles: accessProfile.roles,
  };
}
