import { isTestnetRuntime, resolveMobileApiBaseUrl } from './runtimeConfig';

// Alternun-wide admins: they can create enterprises and projects in the admin panel.
const GLOBAL_ADMIN_ROLES = new Set(['platform_owner', 'internal_admin']);
// Any admin-panel role. Project and enterprise roles are scoped server-side, so the panel itself
// decides which projects each person can open.
const ADMIN_PANEL_ROLES = new Set([
  'platform_owner',
  'internal_admin',
  'moderator',
  'partner_operator',
  'sub_admin',
  'partner_readonly',
]);

export interface AdminAccess {
  /** Alternun global admin (platform owner or internal admin). */
  isGlobalAdmin: boolean;
  /** Holds at least one admin-panel role, global or per project/enterprise. */
  canOpenAdminPanel: boolean;
}

export interface AdminAccessScope {
  role: string;
  enterpriseId: string;
  enterpriseSlug: string | null;
  projectId: string | null;
  projectSlug: string | null;
}

/** GET /v1/me/admin-access: global role from the Alternun admin list plus scoped memberships. */
export interface RemoteAdminAccess {
  globalRole: string | null;
  isGlobalAdmin: boolean;
  scopes: AdminAccessScope[];
  roles: string[];
}

/** Session-token roles merged with the API answer (email logins carry no Authentik claims). */
export interface ResolvedAdminAccess extends AdminAccess {
  roles: string[];
  scopes: AdminAccessScope[];
}

function isScope(value: unknown): value is AdminAccessScope {
  const scope = record(value);
  return typeof scope.role === 'string' && typeof scope.enterpriseId === 'string';
}

export async function loadRemoteAdminAccess(
  token: string,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): Promise<RemoteAdminAccess | null> {
  const response = await fetcher(`${apiUrl.replace(/\/+$/, '')}/v1/me/admin-access`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const body = record(await response.json());
  return {
    globalRole: typeof body.globalRole === 'string' ? body.globalRole : null,
    isGlobalAdmin: body.isGlobalAdmin === true,
    scopes: Array.isArray(body.scopes) ? body.scopes.filter(isScope) : [],
    roles: stringList(body.roles),
  };
}

export function mergeAdminAccess(
  user: unknown,
  remote: RemoteAdminAccess | null
): ResolvedAdminAccess {
  const roles = Array.from(new Set<string>([...resolveUserRoles(user), ...(remote?.roles ?? [])]));
  const fromToken = resolveAdminAccess({ roles });
  return {
    roles: roles.filter((role) => role !== 'authenticated'),
    scopes: remote?.scopes ?? [],
    isGlobalAdmin: fromToken.isGlobalAdmin || remote?.isGlobalAdmin === true,
    canOpenAdminPanel: fromToken.canOpenAdminPanel || remote?.isGlobalAdmin === true,
  };
}

/** Global admins manage every project; others only those their memberships cover. */
export function canManageProject(
  access: ResolvedAdminAccess | null,
  project: { id: string; enterprise?: { id?: string } | null }
): boolean {
  if (!access) return false;
  if (access.isGlobalAdmin) return true;
  return access.scopes.some(
    (scope) =>
      scope.projectId === project.id ||
      (scope.projectId === null && scope.enterpriseId === project.enterprise?.id)
  );
}

export function canManageEnterprise(
  access: ResolvedAdminAccess | null,
  enterpriseId: string
): boolean {
  if (!access) return false;
  return access.isGlobalAdmin || access.scopes.some((scope) => scope.enterpriseId === enterpriseId);
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim());
  return typeof value === 'string' ? value.split(',').map((item) => item.trim()) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Roles of the signed-in user, from the session and from the Authentik claims it keeps
 * (`alternun_roles`). Only used to show admin entry points: the admin panel and the API
 * authorize every action again.
 */
export function resolveUserRoles(user: unknown): string[] {
  const value = record(user);
  const metadata = record(value.metadata);
  const rawClaims = record(metadata.rawClaims);
  const roles: string[] = [
    ...stringList(value.roles),
    ...stringList(metadata.alternun_roles),
    ...stringList(rawClaims.alternun_roles),
    ...stringList(rawClaims.roles),
  ].filter(Boolean);
  return Array.from(new Set<string>(roles));
}

export function resolveAdminAccess(user: unknown): AdminAccess {
  const roles = resolveUserRoles(user);
  return {
    isGlobalAdmin: roles.some((role) => GLOBAL_ADMIN_ROLES.has(role)),
    canOpenAdminPanel: roles.some((role) => ADMIN_PANEL_ROLES.has(role)),
  };
}

/** Admin panel origin for the current environment; EXPO_PUBLIC_ADMIN_URL overrides it. */
export function resolveAdminPanelUrl(
  explicitAdminUrl: string | null | undefined = process.env.EXPO_PUBLIC_ADMIN_URL,
  explicitApiUrl?: string | null,
  explicitOrigin?: string | null
): string {
  const configured = explicitAdminUrl?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const apiUrl = resolveMobileApiBaseUrl(explicitApiUrl, explicitOrigin);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(apiUrl)) return 'http://localhost:5173';
  return isTestnetRuntime(explicitApiUrl, explicitOrigin)
    ? 'https://testnet.admin.alternun.co'
    : 'https://admin.alternun.co';
}

export function adminProjectUrl(projectId: string, adminUrl = resolveAdminPanelUrl()): string {
  return `${adminUrl}/marketplace/projects/${encodeURIComponent(projectId)}`;
}

export function adminEnterpriseUrl(
  enterpriseId: string,
  adminUrl = resolveAdminPanelUrl()
): string {
  return `${adminUrl}/marketplace/enterprises/${encodeURIComponent(enterpriseId)}`;
}
