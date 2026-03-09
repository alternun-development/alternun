import type { AccessControlProvider } from '@refinedev/core';
import { getActiveAdminSession, getAdminRolesFromSession, hasAdminRole } from '../auth/oidc-client';

const readOnlyActions = new Set(['list', 'show']);
const supportWritableResources = new Set(['users', 'wallets', 'organizations', 'memberships']);

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const session = await getActiveAdminSession();
    const roles = getAdminRolesFromSession(session);

    if (!hasAdminRole(roles)) {
      return {
        can: false,
        reason: 'Admin role required.',
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

    return {
      can: false,
      reason: 'Unsupported role for this action.',
    };
  },
};
