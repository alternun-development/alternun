const VERSIONED_PATH_PREFIX = /^\/v\d+(?:\/|$)/;

const VERSION_NEUTRAL_PATH_PREFIXES = ['/auth', '/authentik', '/airs', '/activity', '/decap'];

function hasVersionNeutralPrefix(pathname: string): boolean {
  return VERSION_NEUTRAL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function normalizeLambdaRequestPath(pathname: string): string {
  if (VERSIONED_PATH_PREFIX.test(pathname)) {
    return pathname;
  }

  if (hasVersionNeutralPrefix(pathname)) {
    return pathname;
  }

  return pathname.startsWith('/') ? `/v1${pathname}` : `/v1/${pathname}`;
}
