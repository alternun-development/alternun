/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { buildAuthentikLoginEntryUrl, resolveSafeRedirect } from '@alternun/auth';
import { OidcClient, type UserManager } from 'oidc-client-ts';

export type AdminAuthentikRelayProvider = 'google';

function normalizeInternalHref(target: string): string {
  if (target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }

  try {
    const url = new URL(target);
    return `${url.pathname}${url.search}${url.hash}` || '/dashboard';
  } catch {
    return '/dashboard';
  }
}

export function resolveAdminRelayReturnTo(target: string | null | undefined): string {
  const safe = resolveSafeRedirect(target ?? '/dashboard', {
    allowedOrigins: typeof window === 'undefined' ? [] : [window.location.origin],
    fallbackUrl: '/dashboard',
  });

  return normalizeInternalHref(safe);
}

export function buildAdminAuthentikRelayPath(
  provider: AdminAuthentikRelayProvider,
  returnTo?: string | null
): string {
  const params = new URLSearchParams();
  params.set('provider', provider);
  params.set('next', resolveAdminRelayReturnTo(returnTo));
  return `/auth/relay?${params.toString()}`;
}

export function parseAdminAuthentikRelayProvider(
  value: string | null | undefined
): AdminAuthentikRelayProvider | null {
  return value === 'google' ? value : null;
}

export async function startAdminAuthentikRelaySignIn({
  userManager,
  provider,
  returnTo,
}: {
  userManager: UserManager;
  provider: AdminAuthentikRelayProvider;
  returnTo?: string | null;
}): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('CONFIG_ERROR: Admin Authentik relay requires a browser runtime');
  }

  await userManager.removeUser();

  const oidcClient = new OidcClient(userManager.settings);
  const authorizeRequest = await oidcClient.createSigninRequest({
    state: {
      returnTo: resolveAdminRelayReturnTo(returnTo),
    },
  });

  window.location.replace(
    buildAuthentikLoginEntryUrl({
      issuer: userManager.settings.authority,
      authorizeUrl: authorizeRequest.url,
      providerHint: provider,
    })
  );
}
