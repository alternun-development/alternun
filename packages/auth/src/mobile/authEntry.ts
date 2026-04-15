import { resolveAuthProviderSelection } from '../runtime/config';
import type { AuthExecutionProviderName } from '../core/types';

export type AuthentikLoginEntryMode = 'relay' | 'source';
export type AuthentikSocialLoginMode = 'authentik' | 'hybrid' | 'supabase';
export type AuthentikRelayProvider = 'google' | 'discord';
export type AuthentikProviderFlowSlugs = Partial<Record<AuthentikRelayProvider, string>>;

export interface AuthentikLoginStrategy {
  mode: AuthentikLoginEntryMode;
  socialMode: AuthentikSocialLoginMode;
  executionProvider: AuthExecutionProviderName;
  providerFlowSlugs: AuthentikProviderFlowSlugs;
}

export interface ResolveAuthentikLoginStrategyOptions {
  hostname?: string | null;
  entryMode?: string | undefined | null;
  socialMode?: string | undefined | null;
  executionProvider?: string | undefined | null;
  providerFlowSlugsValue?: string | undefined | null;
  allowCustomProviderFlowSlugs?: boolean | string | undefined | null;
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const TRUTHY_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);
const DEFAULT_AUTHENTIK_LOGIN_ENTRY_MODE: AuthentikLoginEntryMode = 'source';
const DEFAULT_AUTHENTIK_SOCIAL_LOGIN_MODE: AuthentikSocialLoginMode = 'authentik';

function normalizeHostname(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}

function isTruthy(value: boolean | string | undefined | null): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && TRUTHY_ENV_VALUES.has(normalized));
}

function normalizeExecutionProvider(
  value: string | undefined | null
): AuthExecutionProviderName | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'better-auth' || normalized === 'supabase') {
    return normalized;
  }

  return null;
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
  allowCustomProviderFlowSlugs?: boolean | string | undefined | null;
}): AuthentikProviderFlowSlugs {
  const hostname =
    options?.hostname ?? (typeof window !== 'undefined' ? window.location?.hostname ?? null : null);
  if (LOOPBACK_HOSTNAMES.has(normalizeHostname(hostname))) {
    return {};
  }

  const allowCustomProviderFlowSlugs =
    options?.allowCustomProviderFlowSlugs ??
    process.env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS;
  if (!isTruthy(allowCustomProviderFlowSlugs)) {
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
  return (
    getAuthentikLoginEntryMode() === 'relay' &&
    resolveAuthProviderSelection().executionProvider !== 'better-auth'
  );
}

export function resolveAuthentikLoginStrategy(
  options?: ResolveAuthentikLoginStrategyOptions
): AuthentikLoginStrategy {
  const selection = resolveAuthProviderSelection();
  return {
    mode: normalizeAuthentikLoginEntryMode(
      options?.entryMode ?? process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE
    ),
    socialMode: normalizeAuthentikSocialLoginMode(
      options?.socialMode ?? process.env.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE
    ),
    executionProvider:
      normalizeExecutionProvider(options?.executionProvider) ?? selection.executionProvider,
    providerFlowSlugs: resolveAuthentikProviderFlowSlugs({
      hostname: options?.hostname,
      value:
        options?.providerFlowSlugsValue ?? process.env.EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS,
      allowCustomProviderFlowSlugs:
        options?.allowCustomProviderFlowSlugs ??
        process.env.EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS,
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
