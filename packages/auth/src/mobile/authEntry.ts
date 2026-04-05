export type AuthentikLoginEntryMode = 'relay' | 'source';
export type AuthentikSocialLoginMode = 'authentik' | 'hybrid' | 'supabase';
export type AuthentikRelayProvider = 'google' | 'discord';
export type AuthentikProviderFlowSlugs = Partial<Record<AuthentikRelayProvider, string>>;

export interface AuthentikLoginStrategy {
  mode: AuthentikLoginEntryMode;
  socialMode: AuthentikSocialLoginMode;
  providerFlowSlugs: AuthentikProviderFlowSlugs;
}

export interface ResolveAuthentikLoginStrategyOptions {
  hostname?: string | null;
  entryMode?: string | undefined | null;
  socialMode?: string | undefined | null;
  providerFlowSlugsValue?: string | undefined | null;
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DEFAULT_AUTHENTIK_LOGIN_ENTRY_MODE: AuthentikLoginEntryMode = 'source';
const DEFAULT_AUTHENTIK_SOCIAL_LOGIN_MODE: AuthentikSocialLoginMode = 'authentik';

function normalizeHostname(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function parseAuthentikProviderFlowSlugs(
  value: string | undefined | null
): AuthentikProviderFlowSlugs {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const slugs: AuthentikProviderFlowSlugs = {};

    if (typeof parsed.google === 'string' && parsed.google.trim().length > 0) {
      slugs.google = parsed.google.trim();
    }

    if (typeof parsed.discord === 'string' && parsed.discord.trim().length > 0) {
      slugs.discord = parsed.discord.trim();
    }

    return slugs;
  } catch {
    return {};
  }
}

export function resolveAuthentikProviderFlowSlugs(options?: {
  hostname?: string | null;
  value?: string | undefined | null;
}): AuthentikProviderFlowSlugs {
  const hostname =
    options?.hostname ?? (typeof window !== 'undefined' ? window.location?.hostname ?? null : null);
  if (LOOPBACK_HOSTNAMES.has(normalizeHostname(hostname))) {
    return {};
  }

  return parseAuthentikProviderFlowSlugs(
    options?.value ?? process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS
  );
}

export function normalizeAuthentikLoginEntryMode(
  value: string | undefined | null
): AuthentikLoginEntryMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'relay' || normalized === 'source') {
    return normalized;
  }

  return DEFAULT_AUTHENTIK_LOGIN_ENTRY_MODE;
}

export function normalizeAuthentikSocialLoginMode(
  value: string | undefined | null
): AuthentikSocialLoginMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'authentik' || normalized === 'hybrid' || normalized === 'supabase') {
    return normalized;
  }

  return DEFAULT_AUTHENTIK_SOCIAL_LOGIN_MODE;
}

export function getAuthentikLoginEntryMode(): AuthentikLoginEntryMode {
  return normalizeAuthentikLoginEntryMode(process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE);
}

export function getAuthentikSocialLoginMode(): AuthentikSocialLoginMode {
  return normalizeAuthentikSocialLoginMode(process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE);
}

export function shouldUseAuthentikRelayEntry(): boolean {
  return getAuthentikLoginEntryMode() === 'relay';
}

export function resolveAuthentikLoginStrategy(
  options?: ResolveAuthentikLoginStrategyOptions
): AuthentikLoginStrategy {
  return {
    mode: normalizeAuthentikLoginEntryMode(
      options?.entryMode ?? process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE
    ),
    socialMode: normalizeAuthentikSocialLoginMode(
      options?.socialMode ?? process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE
    ),
    providerFlowSlugs: resolveAuthentikProviderFlowSlugs({
      hostname: options?.hostname,
      value:
        options?.providerFlowSlugsValue ?? process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS,
    }),
  };
}

export interface AuthentikRelayRoute {
  pathname: '/auth-relay';
  params: {
    provider: AuthentikRelayProvider;
    fresh: '0' | '1';
    next?: string;
  };
}

export function buildAuthentikRelayPath(
  providerHint: AuthentikRelayProvider,
  options?: { next?: string; forceFreshSession?: boolean }
): string {
  const route = buildAuthentikRelayRoute(providerHint, options);
  const params = new URLSearchParams();
  params.set('provider', route.params.provider);
  if (route.params.next) {
    params.set('next', route.params.next);
  }
  params.set('fresh', route.params.fresh);
  const query = params.toString();
  return `/auth-relay${query ? `?${query}` : ''}`;
}

export function buildAuthentikRelayRoute(
  providerHint: AuthentikRelayProvider,
  options?: { next?: string; forceFreshSession?: boolean }
): AuthentikRelayRoute {
  const route: AuthentikRelayRoute = {
    pathname: '/auth-relay',
    params: {
      provider: providerHint,
      fresh: options?.forceFreshSession === true ? '1' : '0',
    },
  };

  const trimmedNext = options?.next?.trim();
  if (trimmedNext) {
    route.params.next = trimmedNext;
  }

  return route;
}
