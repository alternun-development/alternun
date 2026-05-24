const DEFAULT_TESTNET_API_URL = 'https://testnet.api.alternun.co';
const LOCAL_API_URL = 'http://localhost:8082';

function trimRuntimeValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
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

function isLoopbackOrigin(value: string): boolean {
  try {
    return isLoopbackHostname(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isLoopbackApiUrl(value: string): boolean {
  try {
    return isLoopbackHostname(new URL(value).hostname);
  } catch {
    return false;
  }
}

function deriveApiUrlFromOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (isLoopbackHostname(url.hostname)) {
      return LOCAL_API_URL;
    }

    const hostnameParts = url.hostname.split('.');
    const airsIndex = hostnameParts.indexOf('airs');

    if (airsIndex >= 0) {
      // The index is derived from a fixed hostname segment and cannot be user-supplied.
      // eslint-disable-next-line security/detect-object-injection
      hostnameParts[airsIndex] = 'api';
      return `${url.protocol}//${hostnameParts.join('.')}`;
    }

    return url.origin;
  } catch {
    return DEFAULT_TESTNET_API_URL;
  }
}

function normalizeBetterAuthBaseUrl(value: string | null | undefined): string | null {
  const trimmed = trimRuntimeValue(value);
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(
      trimmed
        .replace(/\/+$/, '')
        .replace(/\/auth\/exchange$/, '')
        .replace(/\/auth$/, '')
    );
    const pathname = url.pathname === '/' ? '' : url.pathname;
    return `${url.origin}${pathname}`.replace(/\/+$/, '');
  } catch {
    return trimmed
      .replace(/\?.*$/, '')
      .replace(/#.*$/, '')
      .replace(/\/+$/, '')
      .replace(/\/auth\/exchange$/, '')
      .replace(/\/auth$/, '');
  }
}

export function resolveMobileApiBaseUrl(
  explicitApiUrl?: string | null,
  explicitOrigin?: string | null
): string {
  const configuredApiUrl =
    trimRuntimeValue(explicitApiUrl) ?? trimRuntimeValue(process.env.EXPO_PUBLIC_API_URL);
  const runtimeOrigin =
    trimRuntimeValue(explicitOrigin) ??
    trimRuntimeValue(process.env.EXPO_PUBLIC_ORIGIN) ??
    trimRuntimeValue(typeof window !== 'undefined' ? window.location?.origin : undefined);

  if (runtimeOrigin) {
    const runtimeIsLoopback = isLoopbackOrigin(runtimeOrigin);
    const configuredIsLoopback = configuredApiUrl ? isLoopbackApiUrl(configuredApiUrl) : false;
    const derivedApiUrl = deriveApiUrlFromOrigin(runtimeOrigin);
    if (runtimeIsLoopback) {
      return configuredApiUrl && configuredIsLoopback ? configuredApiUrl : derivedApiUrl;
    }

    if (configuredApiUrl && configuredIsLoopback) {
      return derivedApiUrl;
    }

    if (configuredApiUrl) {
      return configuredApiUrl;
    }

    return derivedApiUrl;
  }

  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  return DEFAULT_TESTNET_API_URL;
}

export function resolveMobileBetterAuthBaseUrl(
  explicitAuthUrl?: string | null,
  explicitOrigin?: string | null
): string | undefined {
  const configuredAuthUrl =
    normalizeBetterAuthBaseUrl(explicitAuthUrl) ??
    normalizeBetterAuthBaseUrl(process.env.EXPO_PUBLIC_BETTER_AUTH_URL);
  const runtimeOrigin =
    trimRuntimeValue(explicitOrigin) ??
    trimRuntimeValue(process.env.EXPO_PUBLIC_ORIGIN) ??
    trimRuntimeValue(typeof window !== 'undefined' ? window.location?.origin : undefined);

  if (runtimeOrigin) {
    const runtimeIsLoopback = isLoopbackOrigin(runtimeOrigin);
    const configuredIsLoopback = configuredAuthUrl ? isLoopbackOrigin(configuredAuthUrl) : false;
    if (runtimeIsLoopback) {
      return resolveMobileApiBaseUrl(undefined, runtimeOrigin);
    }

    if (configuredAuthUrl && configuredIsLoopback) {
      return resolveMobileApiBaseUrl(undefined, runtimeOrigin);
    }

    if (configuredAuthUrl) {
      return configuredAuthUrl;
    }

    return resolveMobileApiBaseUrl(undefined, runtimeOrigin);
  }

  return configuredAuthUrl ?? undefined;
}
