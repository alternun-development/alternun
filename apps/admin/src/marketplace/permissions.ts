import { useEffect, useState } from 'react';
import {
  getActiveAdminSession,
  getAdminRolesFromSession,
  type AdminRole,
} from '../auth/oidc-client';
import type { MediaKind } from './api';

export type MarketplacePermission =
  | 'enterprises:create'
  | 'projects:create'
  | 'projects:update'
  | 'projects:publish'
  | 'projects:pause'
  | 'projects:archive'
  | 'project_media:write'
  | 'project_media:moderate'
  | 'activities:write'
  | 'activities:publish'
  | 'completions:award'
  | 'completions:reject'
  | 'completions:reverse'
  | 'comments:read'
  | 'comments:moderate'
  | 'participants:read'
  | 'participants:manage'
  | 'airs_reports:submit'
  | 'audit:read'
  | 'project_memberships:assign'
  | 'project_memberships:revoke';

const permissionsByRole: Readonly<Record<AdminRole, readonly MarketplacePermission[]>> = {
  partner_readonly: [],
  sub_admin: [
    'projects:update',
    'project_media:write',
    'project_media:moderate',
    'activities:write',
    'completions:reject',
    'comments:read',
    'comments:moderate',
    'participants:read',
    'participants:manage',
    'airs_reports:submit',
  ],
  partner_operator: [
    'projects:create',
    'projects:update',
    'project_media:write',
    'project_media:moderate',
    'activities:write',
    'activities:publish',
    'completions:award',
    'completions:reject',
    'comments:read',
    'comments:moderate',
    'participants:read',
    'participants:manage',
    'airs_reports:submit',
    'audit:read',
    'project_memberships:assign',
    'project_memberships:revoke',
  ],
  moderator: [
    'projects:update',
    'project_media:moderate',
    'comments:read',
    'comments:moderate',
    'audit:read',
  ],
  internal_admin: [
    'enterprises:create',
    'projects:create',
    'projects:update',
    'projects:publish',
    'projects:pause',
    'projects:archive',
    'project_media:write',
    'project_media:moderate',
    'activities:write',
    'activities:publish',
    'completions:award',
    'completions:reject',
    'comments:read',
    'comments:moderate',
    'participants:read',
    'participants:manage',
    'airs_reports:submit',
    'audit:read',
    'project_memberships:assign',
    'project_memberships:revoke',
  ],
  platform_owner: [
    'enterprises:create',
    'projects:create',
    'projects:update',
    'projects:publish',
    'projects:pause',
    'projects:archive',
    'project_media:write',
    'project_media:moderate',
    'activities:write',
    'activities:publish',
    'completions:award',
    'completions:reject',
    'completions:reverse',
    'comments:read',
    'comments:moderate',
    'participants:read',
    'participants:manage',
    'airs_reports:submit',
    'audit:read',
    'project_memberships:assign',
    'project_memberships:revoke',
  ],
};

export function hasMarketplacePermission(
  roles: readonly AdminRole[],
  permission: MarketplacePermission
): boolean {
  return roles.some((role) => permissionsByRole[role].includes(permission));
}

export const brandMediaKinds: ReadonlySet<MediaKind> = new Set<MediaKind>(['logo', 'cover']);

// Mirrors the API: only global admins and the project's partner_operator change brand media.
// The server also checks the partner_operator membership; this only hides controls.
export function canChangeBrandMedia(roles: readonly AdminRole[]): boolean {
  return roles.some(
    (role) => role === 'platform_owner' || role === 'internal_admin' || role === 'partner_operator'
  );
}

export function useMarketplaceRoles(): readonly AdminRole[] | null {
  const [roles, setRoles] = useState<readonly AdminRole[] | null>(null);
  useEffect(() => {
    void getActiveAdminSession().then((session) => setRoles(getAdminRolesFromSession(session)));
  }, []);
  return roles;
}

export function membershipRolesGrantedBy(
  roles: readonly AdminRole[]
): Array<'partner_operator' | 'sub_admin' | 'partner_readonly'> {
  if (roles.some((role) => role === 'platform_owner' || role === 'internal_admin')) {
    return ['partner_operator', 'sub_admin', 'partner_readonly'];
  }
  return roles.includes('partner_operator') ? ['sub_admin', 'partner_readonly'] : [];
}
