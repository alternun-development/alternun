type BetterAuthRequestHeaderValue = string | string[] | number | undefined;
type BetterAuthRequestHeaders = Record<string, BetterAuthRequestHeaderValue>;

function normalizeHeaderValue(value: BetterAuthRequestHeaderValue): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(', ');
    return normalized.length > 0 ? normalized : null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  );
}

function deriveAppOriginFromRequestHeaders(
  requestHeaders: BetterAuthRequestHeaders,
  fallbackBaseUrl: string
): string {
  const fallbackUrl = new URL(fallbackBaseUrl);
  const forwardedHost = normalizeHeaderValue(requestHeaders['x-forwarded-host']);
  const forwardedProto = normalizeHeaderValue(requestHeaders['x-forwarded-proto']);
  const host = forwardedHost ?? normalizeHeaderValue(requestHeaders.host) ?? fallbackUrl.host;
  const protocol = forwardedProto ?? fallbackUrl.protocol.replace(/:$/, '');
  const url = new URL(`${protocol}://${host}`);

  if (isLoopbackHostname(url.hostname)) {
    const port = Number(url.port || '0');
    if (Number.isFinite(port) && port > 0) {
      url.port = String(Math.max(port - 1, 1));
    } else {
      url.port = '8081';
    }

    return url.origin;
  }

  const hostnameParts = url.hostname.split('.');
  const apiIndex = hostnameParts.indexOf('api');
  if (apiIndex < 0) {
    return url.origin;
  }

  hostnameParts[apiIndex] = 'airs';
  url.hostname = hostnameParts.join('.');
  return url.origin;
}

function isErrorRedirectPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/auth/error';
}

export function rewriteBetterAuthErrorRedirect(
  locationValue: string | null | undefined,
  requestPath: string,
  requestHeaders: BetterAuthRequestHeaders,
  fallbackBaseUrl: string
): string | null {
  const trimmedLocation = locationValue?.trim();
  if (!trimmedLocation) {
    return null;
  }

  if (requestPath !== '/auth/error') {
    return trimmedLocation;
  }

  try {
    const redirectUrl = new URL(
      trimmedLocation,
      `${deriveAppOriginFromRequestHeaders(requestHeaders, fallbackBaseUrl)}/`
    );

    if (!isErrorRedirectPath(redirectUrl.pathname) || !redirectUrl.searchParams.has('error')) {
      return trimmedLocation;
    }

    const appOrigin = deriveAppOriginFromRequestHeaders(requestHeaders, fallbackBaseUrl);
    const search = redirectUrl.searchParams.toString();
    const hash = redirectUrl.hash?.trim() ?? '';
    return `${appOrigin}/auth/callback${search ? `?${search}` : ''}${hash}`;
  } catch {
    return trimmedLocation;
  }
}
