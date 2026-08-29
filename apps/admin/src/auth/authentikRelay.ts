import { OidcClient, type UserManager } from 'oidc-client-ts';
import { adminEnv } from '../config/env';

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

function resolveSafeAdminRedirect(target: string | null | undefined): string {
  if (!target) {
    return '/dashboard';
  }

  if (target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }

  if (typeof window === 'undefined') {
    return '/dashboard';
  }

  try {
    const url = new URL(target, window.location.origin);
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

function buildAdminAuthentikLoginEntryUrl({
  issuer,
  authorizeUrl,
  flowSlug,
}: {
  issuer: string;
  authorizeUrl: string;
  flowSlug?: string;
}): string {
  const authentikOrigin = new URL(issuer).origin;
  const trimmedAuthorizeUrl = authorizeUrl.trim();

  if (!trimmedAuthorizeUrl) {
    throw new Error('CONFIG_ERROR: authorizeUrl is required');
  }

  if (flowSlug?.trim()) {
    return `${authentikOrigin}/if/flow/${encodeURIComponent(
      flowSlug.trim()
    )}/?next=${encodeURIComponent(trimmedAuthorizeUrl)}`;
  }

  return `${authentikOrigin}/source/oauth/login/google/?next=${encodeURIComponent(
    trimmedAuthorizeUrl
  )}`;
}

export function resolveAdminRelayReturnTo(target: string | null | undefined): string {
  return normalizeInternalHref(resolveSafeAdminRedirect(target));
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
    buildAdminAuthentikLoginEntryUrl({
      issuer: userManager.settings.authority,
      authorizeUrl: authorizeRequest.url,
      flowSlug: provider === 'google' ? adminEnv.authGoogleFlowSlug : undefined,
    })
  );
}
