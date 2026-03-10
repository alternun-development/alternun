import type { AccessControlProvider } from '@refinedev/core';
import {
  getActiveAdminSession,
  getAdminRolesFromSession,
  hasAdminRole,
  hasAllowedAdminEmailDomain,
} from '../auth/oidc-client';

const readOnlyActions = new Set(['list', 'show']);
const supportWritableResources = new Set(['users', 'wallets', 'organizations', 'memberships']);

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const session = await getActiveAdminSession();
    const roles = getAdminRolesFromSession(session);
    const hasCompanyEmailAccess = hasAllowedAdminEmailDomain(session);

    if (!hasAdminRole(roles) && !hasCompanyEmailAccess) {
      return {
        can: false,
        reason: 'Only approved admin users or @alternun.io accounts can access this dashboard.',
      };
    }

    if (roles.includes('platform_admin')) {
      return { can: true };
    }

    if (resource === 'dashboard' || !resource) {
      return { can: true };
    }

    if (roles.includes('support_admin')) {
      if (readOnlyActions.has(action)) {
        return { can: true };
      }

      return {
        can: supportWritableResources.has(resource),
        reason: supportWritableResources.has(resource)
          ? undefined
          : 'Support admins have read-only access for this section.',
      };
    }

    if (roles.includes('read_only_admin')) {
      return {
        can: readOnlyActions.has(action),
        reason: readOnlyActions.has(action)
          ? undefined
          : 'Read-only admins cannot mutate resources.',
      };
    }

    if (hasCompanyEmailAccess) {
      return {
        can: resource === 'dashboard' || !resource || readOnlyActions.has(action),
        reason:
          resource === 'dashboard' || !resource || readOnlyActions.has(action)
            ? undefined
            : 'Workspace Google users have read-only dashboard access.',
      };
    }

    return {
      can: false,
      reason: 'Unsupported role for this action.',
    };
  },
};
