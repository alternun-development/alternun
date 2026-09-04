import type { AccessControlProvider } from '@refinedev/core';
import {
  getActiveAdminSession,
  getAdminOrganizationIdsFromSession,
  getAdminRolesFromSession,
  resolveAdminAccessProfile,
} from '../auth/oidc-client';

const readOnlyActions = new Set(['list', 'show']);

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const session = await getActiveAdminSession();
    const accessProfile = resolveAdminAccessProfile(
      getAdminRolesFromSession(session),
      getAdminOrganizationIdsFromSession(session)
    );

    if (!accessProfile) {
      return {
        can: false,
        reason: 'Only users assigned to an approved Alternun admin role can access this dashboard.',
      };
    }

    if (resource === 'dashboard' || !resource) {
      return { can: true };
    }

    if (!accessProfile.allowedResources.includes(resource)) {
      return {
        can: false,
        reason:
          accessProfile.surface === 'partner'
            ? 'Your partner workspace is restricted to your assigned sections.'
            : 'Your admin role does not grant access to this section.',
      };
    }

    if (readOnlyActions.has(action)) {
      return { can: true };
    }

    if (accessProfile.surface === 'partner') {
      return {
        can: false,
        reason: 'Partner access is currently limited to read-only workflows in this panel.',
      };
    }

    return { can: true };
  },
};
