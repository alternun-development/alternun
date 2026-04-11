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

export function resolveMobileApiBaseUrl(
  explicitApiUrl?: string | null,
  explicitOrigin?: string | null
): string {
  const configuredApiUrl =
    trimRuntimeValue(explicitApiUrl) ?? trimRuntimeValue(process.env.EXPO_PUBLIC_API_URL);
  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  const runtimeOrigin =
    trimRuntimeValue(explicitOrigin) ??
    trimRuntimeValue(process.env.EXPO_PUBLIC_ORIGIN) ??
    trimRuntimeValue(typeof window !== 'undefined' ? window.location.origin : undefined);

  if (runtimeOrigin) {
    return deriveApiUrlFromOrigin(runtimeOrigin);
  }

  return DEFAULT_TESTNET_API_URL;
}
