export type AuthentikLoginEntryMode = 'relay' | 'source';
export type AuthentikRelayProvider = 'google' | 'discord';

export interface AuthentikRelayRoute {
  pathname: '/auth-relay';
  params: {
    provider: AuthentikRelayProvider;
    fresh: '0' | '1';
    next?: string;
  };
}

const DEFAULT_AUTHENTIK_LOGIN_ENTRY_MODE: AuthentikLoginEntryMode = 'relay';

function normalizeAuthentikLoginEntryMode(
  value: string | undefined | null
): AuthentikLoginEntryMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'relay' || normalized === 'source') {
    return normalized;
  }

  return DEFAULT_AUTHENTIK_LOGIN_ENTRY_MODE;
}

export function getAuthentikLoginEntryMode(): AuthentikLoginEntryMode {
  return normalizeAuthentikLoginEntryMode(process.env.EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE);
}

export function shouldUseAuthentikRelayEntry(): boolean {
  return getAuthentikLoginEntryMode() === 'relay';
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
      fresh: options?.forceFreshSession === false ? '0' : '1',
    },
  };

  const trimmedNext = options?.next?.trim();
  if (trimmedNext) {
    route.params.next = trimmedNext;
  }

  return route;
}

export { normalizeAuthentikLoginEntryMode };
