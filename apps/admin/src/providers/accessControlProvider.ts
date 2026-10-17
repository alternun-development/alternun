import type { AccessControlProvider } from '@refinedev/core';
import {
  getActiveAdminSession,
  getAdminOrganizationIdsFromSession,
  getAdminRolesFromSession,
  resolveAdminAccessProfile,
} from '../auth/oidc-client';

const partnerWritableResources = new Set(['marketplace-enterprises', 'marketplace-projects']);
const readOnlyActions = new Set(['list', 'show']);

export function partnerCanUseAdminAction(resource: string, action: string): boolean {
  return readOnlyActions.has(action) || partnerWritableResources.has(resource);
}

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

    if (!resource) {
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

    if (accessProfile.surface === 'partner' && !partnerCanUseAdminAction(resource, action)) {
      return {
        can: false,
        reason: 'Partner access is currently limited to read-only workflows in this panel.',
      };
    }

    return { can: true };
  },
};
