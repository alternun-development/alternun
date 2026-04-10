/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { OidcClient } from 'oidc-client-ts';
import type { DocsCmsUserManager } from './auth';

export type DocsCmsAuthentikRelayProvider = 'google';

interface SafeRedirectOptions {
  allowedOrigins: string[];
  fallbackUrl: string;
}

interface BuildAuthentikLoginEntryUrlInput {
  issuer: string;
  authorizeUrl: string;
  providerHint?: string | null;
}

function normalizeInternalHref(target: string): string {
  if (target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }

  try {
    const url = new URL(target);
    return `${url.pathname}${url.search}${url.hash}` || '/admin';
  } catch {
    return '/admin';
  }
}

function resolveSafeRedirect(target: string, options: SafeRedirectOptions): string {
  const fallbackUrl = normalizeInternalHref(options.fallbackUrl);

  if (target.startsWith('/') && !target.startsWith('//')) {
    return normalizeInternalHref(target);
  }

  try {
    const url = new URL(target);
    if (options.allowedOrigins.includes(url.origin)) {
      return normalizeInternalHref(`${url.pathname}${url.search}${url.hash}` || fallbackUrl);
    }
  } catch {
    return fallbackUrl;
  }

  return fallbackUrl;
}

function buildAuthentikLoginEntryUrl({
  issuer,
  authorizeUrl,
  providerHint,
}: BuildAuthentikLoginEntryUrlInput): string {
  const trimmedAuthorizeUrl = authorizeUrl.trim();
  const normalizedProviderHint = providerHint?.trim();

  if (!trimmedAuthorizeUrl) {
    throw new Error('CONFIG_ERROR: authorizeUrl is required');
  }

  if (!normalizedProviderHint) {
    return trimmedAuthorizeUrl;
  }

  const authentikOrigin = new URL(issuer).origin;
  return `${authentikOrigin}/source/oauth/login/${encodeURIComponent(
    normalizedProviderHint
  )}/?next=${encodeURIComponent(trimmedAuthorizeUrl)}`;
}

export function resolveDocsCmsRelayReturnTo(target: string | null | undefined): string {
  const safe = resolveSafeRedirect(target ?? '/admin', {
    allowedOrigins: typeof window === 'undefined' ? [] : [window.location.origin],
    fallbackUrl: '/admin',
  });

  return normalizeInternalHref(safe);
}

export function buildDocsCmsAuthentikRelayPath(
  provider: DocsCmsAuthentikRelayProvider,
  returnTo?: string | null
): string {
  const params = new URLSearchParams();
  params.set('provider', provider);
  params.set('next', resolveDocsCmsRelayReturnTo(returnTo));
  return `/admin/auth/relay?${params.toString()}`;
}

export function parseDocsCmsAuthentikRelayProvider(
  value: string | null | undefined
): DocsCmsAuthentikRelayProvider | null {
  return value === 'google' ? value : null;
}

export async function startDocsCmsAuthentikRelaySignIn({
  userManager,
  provider,
  returnTo,
}: {
  userManager: DocsCmsUserManager;
  provider: DocsCmsAuthentikRelayProvider;
  returnTo?: string | null;
}): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('CONFIG_ERROR: Docs CMS Authentik relay requires a browser runtime');
  }

  await userManager.removeUser();

  const oidcClient = new OidcClient(userManager.settings);
  const authorizeRequest = await oidcClient.createSigninRequest({
    state: {
      returnTo: resolveDocsCmsRelayReturnTo(returnTo),
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
