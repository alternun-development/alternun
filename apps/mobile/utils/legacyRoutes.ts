import { useEffect } from 'react';
import {
  useGlobalSearchParams,
  usePathname,
  useRootNavigationState,
  useRouter,
  type Href,
} from 'expo-router';

/**
 * Legacy (Spanish) URL prefixes → current English routes.
 * Links already sent by email (e.g. https://airs.alternun.co/mi-perfil) must keep working.
 * Order matters: more specific prefixes first.
 */
export const LEGACY_ROUTE_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['/explorar/empresa', '/explore/enterprise'],
  ['/explorar', '/explore'],
  ['/mi-perfil', '/profile'],
  ['/portafolio', '/portfolio'],
];

export function resolveLegacyRoute(pathname: string): string | null {
  for (const [legacy, current] of LEGACY_ROUTE_PREFIXES) {
    if (pathname === legacy || pathname.startsWith(`${legacy}/`)) {
      return current + pathname.slice(legacy.length);
    }
  }
  return null;
}

// Rebuilds the query string, dropping expo-router's `not-found` catch-all param.
export function toQueryString(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'not-found' || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) search.append(key, item);
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

/**
 * Used by app/+not-found.tsx: legacy paths don't match any route file, so they land on the
 * not-found screen, which replaces them with the English route while keeping query params.
 * Returns true while a redirect is pending.
 */
export function useLegacyRouteRedirect(): boolean {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const router = useRouter();
  const navigationReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    const target = resolveLegacyRoute(pathname);
    if (!navigationReady || !target) {
      return;
    }
    router.replace(`${target}${toQueryString(params)}` as Href);
  }, [navigationReady, pathname, params, router]);

  return resolveLegacyRoute(pathname) !== null;
}
