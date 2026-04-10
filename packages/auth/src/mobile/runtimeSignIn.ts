import type { AuthClient, AuthRuntime } from '@edcalderon/auth';
import { resolveSafeRedirect } from '@edcalderon/auth/authentik';
import type { OidcProvider } from './authentikClient';
import { isAuthentikConfigured, startAuthentikOAuthFlow } from './authentikClient';
import type { AuthentikLoginStrategy } from './authEntry';
import { resolveAuthentikLoginStrategy } from './authEntry';
import { buildAuthentikWebCallbackUrl } from './authentikUrls';

const AUTH_RETURN_TO_STORAGE_KEY = 'alternun:auth:return-to';

export interface WebRedirectSignInOptions {
  client: AuthClient;
  provider: string;
  redirectTo?: string | null;
  authentikProviderHint?: OidcProvider;
  forceFreshSession?: boolean;
  strategy?: AuthentikLoginStrategy;
}

export interface NativeSignInOptions {
  client: AuthClient;
  provider: string;
  redirectUri?: string | null;
}

function canUseBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function resolveAuthRuntime(): AuthRuntime {
  return canUseBrowserRuntime() ? 'web' : 'native';
}

function normalizeInternalHref(target: string): string {
  if (target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }

  try {
    const url = new URL(target);
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
}

export function resolveAuthReturnTo(target: string | null | undefined): string {
  const allowedOrigins = canUseBrowserRuntime() ? [window.location.origin] : [];
  const safe = resolveSafeRedirect(target ?? '/', { allowedOrigins, fallbackUrl: '/' });
  return normalizeInternalHref(safe);
}

export function storeAuthReturnTo(target: string | null | undefined): string {
  const resolvedTarget = resolveAuthReturnTo(target);

  if (canUseBrowserRuntime()) {
    window.sessionStorage.setItem(AUTH_RETURN_TO_STORAGE_KEY, resolvedTarget);
  }

  return resolvedTarget;
}

export function readAuthReturnTo(): string | null {
  if (!canUseBrowserRuntime()) {
    return null;
  }

  const stored = window.sessionStorage.getItem(AUTH_RETURN_TO_STORAGE_KEY);
  return stored?.trim() ?? null;
}

export function clearAuthReturnTo(): void {
  if (!canUseBrowserRuntime()) {
    return;
  }

  window.sessionStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY);
}

export function getAuthentikWebCallbackUrl(): string {
  if (!canUseBrowserRuntime()) {
    throw new Error('CONFIG_ERROR: Browser callback URL requires a web runtime');
  }

  const callbackUrl = buildAuthentikWebCallbackUrl(window.location.origin);
  if (!callbackUrl) {
    throw new Error('CONFIG_ERROR: Unable to derive the web callback URL');
  }

  return callbackUrl;
}

function shouldUseAuthentikWebFlow(
  strategy: AuthentikLoginStrategy,
  authentikReady: boolean,
  authentikProviderHint?: OidcProvider
): boolean {
  if (!authentikProviderHint) {
    return false;
  }

  if (strategy.socialMode === 'supabase') {
    return false;
  }

  if (strategy.socialMode === 'authentik') {
    return true;
  }

  return authentikReady;
}

function shouldUseBetterAuthWebFlow(
  strategy: AuthentikLoginStrategy,
  provider: string,
  authentikProviderHint?: OidcProvider
): boolean {
  // Better Auth owns the social-login migration path here; the facade will
  // exchange the resulting external identity into the canonical Authentik
  // session after callback completion.
  const normalizedProvider = provider.trim().toLowerCase();
  return (
    strategy.executionProvider === 'better-auth' &&
    (normalizedProvider === 'google' || normalizedProvider === 'discord') &&
    authentikProviderHint === normalizedProvider
  );
}

export async function webRedirectSignIn({
  client,
  provider,
  redirectTo,
  authentikProviderHint,
  forceFreshSession = false,
  strategy = resolveAuthentikLoginStrategy(),
}: WebRedirectSignInOptions): Promise<'authentik' | 'supabase' | 'better-auth'> {
  if (!canUseBrowserRuntime()) {
    throw new Error('CONFIG_ERROR: webRedirectSignIn requires a browser runtime');
  }

  const callbackUrl = getAuthentikWebCallbackUrl();
  const authentikReady = isAuthentikConfigured({
    redirectUri: callbackUrl,
  });

  storeAuthReturnTo(redirectTo);

  if (shouldUseBetterAuthWebFlow(strategy, provider, authentikProviderHint)) {
    await client.signIn({
      provider,
      flow: 'redirect',
      redirectUri: callbackUrl,
    });
    return 'better-auth';
  }

  if (shouldUseAuthentikWebFlow(strategy, authentikReady, authentikProviderHint)) {
    if (!authentikReady || !authentikProviderHint) {
      throw new Error('CONFIG_ERROR: Missing Authentik issuer, clientId, or redirectUri');
    }

    await startAuthentikOAuthFlow(authentikProviderHint, {
      redirectUri: callbackUrl,
      providerFlowSlugs: strategy.providerFlowSlugs,
      forceFreshSession,
    });
    return 'authentik';
  }

  await client.signIn({
    provider,
    flow: 'redirect',
    redirectUri: callbackUrl,
  });
  return 'supabase';
}

export async function nativeSignIn({
  client,
  provider,
  redirectUri,
}: NativeSignInOptions): Promise<void> {
  await client.signIn({
    provider,
    flow: 'native',
    redirectUri: redirectUri?.trim() ?? undefined,
  });
}
