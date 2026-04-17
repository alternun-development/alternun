import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from 'oidc-client-ts';
import { adminEnv } from '../config/env';

type ClaimBag = Record<string, unknown>;

const ADMIN_ROLES = ['platform_admin', 'support_admin', 'read_only_admin'] as const;
const ADMIN_GROUP_ROLE_ALIASES: Map<string, (typeof ADMIN_ROLES)[number]> = new Map([
  ['authentik admins', 'platform_admin'],
  ['alternun dashboard admins', 'platform_admin'],
]);

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

function getSessionEmail(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const claims = user.profile as ClaimBag;
  return typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null;
}

export function hasAllowedAdminEmailDomain(user: User | null): boolean {
  const email = getSessionEmail(user);

  if (!email) {
    return false;
  }

  const expectedDomain = adminEnv.allowedEmailDomain.trim().toLowerCase();
  return expectedDomain.length > 0 && email.endsWith(`@${expectedDomain}`);
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

export function getAdminRolesFromSession(user: User | null): string[] {
  if (!user) {
    return [];
  }

  const claims = user.profile as ClaimBag;
  const roles = new Set<string>([
    ...readClaimArray(claims, 'roles'),
    ...readClaimArray(claims, 'alternun_roles'),
    ...readClaimArray(claims, 'role'),
  ]);
  const groups = readClaimArray(claims, 'groups');

  for (const group of groups) {
    roles.add(group);

    const normalizedGroup = group.trim().toLowerCase();
    const aliasedRole = ADMIN_GROUP_ROLE_ALIASES.get(normalizedGroup);
    if (aliasedRole) {
      roles.add(aliasedRole);
    }
  }

  return Array.from(roles);
}

export function hasAdminRole(roles: string[]): boolean {
  return roles.some((role) => ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
}

export function canAccessAdminDashboard(user: User | null): boolean {
  const roles = getAdminRolesFromSession(user);
  return hasAdminRole(roles) || hasAllowedAdminEmailDomain(user);
}

export function extractAdminIdentity(user: User | null): {
  id: string;
  email?: string;
  fullName?: string;
  name: string;
  roles: string[];
} | null {
  if (!user) {
    return null;
  }

  const claims = user.profile as ClaimBag;
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
    roles: getAdminRolesFromSession(user),
  };
}
