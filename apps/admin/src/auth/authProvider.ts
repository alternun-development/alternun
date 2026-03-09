import type { AuthProvider, RefineError } from '@refinedev/core';
import {
  extractAdminIdentity,
  getActiveAdminSession,
  getAdminRolesFromSession,
  hasAdminRole,
  oidcClient,
} from './oidc-client';

function currentReturnTo(): string {
  if (typeof window === 'undefined') {
    return '/dashboard';
  }

  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return path === '/login' || path === '/auth/callback' ? '/dashboard' : path;
}

export const authProvider: AuthProvider = {
  login: async () => {
    const session = await getActiveAdminSession();
    const roles = getAdminRolesFromSession(session);

    if (session && hasAdminRole(roles)) {
      return {
        success: true,
        redirectTo: '/dashboard',
      };
    }

    await oidcClient.signinRedirect({
      state: {
        returnTo: currentReturnTo(),
      },
    });

    return {
      success: true,
    };
  },
  logout: async () => {
    await oidcClient.removeUser();
    await oidcClient.signoutRedirect();

    return {
      success: true,
    };
  },
  check: async () => {
    const session = await getActiveAdminSession();
    const roles = getAdminRolesFromSession(session);

    if (!session) {
      return {
        authenticated: false,
        redirectTo: '/login',
      };
    }

    if (!hasAdminRole(roles)) {
      return {
        authenticated: false,
        redirectTo: '/login',
        error: new Error('Admin role required to access Alternun Admin.'),
      };
    }

    return {
      authenticated: true,
    };
  },
  getPermissions: async () => {
    const session = await getActiveAdminSession();
    return getAdminRolesFromSession(session);
  },
  getIdentity: async () => {
    const session = await getActiveAdminSession();
    return extractAdminIdentity(session);
  },
  onError: async (error: unknown) => {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'Admin request failed.');
    const refineError = normalizedError as unknown as RefineError & {
      status?: number;
      statusCode?: number;
      response?: { status?: number };
    };
    const status = refineError.status ?? refineError.response?.status ?? refineError.statusCode;

    if (status === 401) {
      await oidcClient.removeUser();

      return {
        logout: true,
        redirectTo: '/login',
        error: normalizedError,
      };
    }

    if (status === 403) {
      return {
        error: normalizedError,
        redirectTo: '/dashboard',
      };
    }

    return {
      error: normalizedError,
    };
  },
};
