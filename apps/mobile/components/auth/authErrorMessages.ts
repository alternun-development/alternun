const KNOWN_AUTH_ERROR_PREFIXES = [
  'CONFIG_ERROR:',
  'MIGRATION_ERROR:',
  'NETWORK_ERROR:',
  'PROVIDER_ERROR:',
  'SESSION_ERROR:',
  'UNSUPPORTED_FLOW:',
  'VALIDATION_ERROR:',
] as const;

interface SocialSignInErrorMessages {
  unavailable: string;
  serverError: string;
  fallback: string;
}

type HttpStatusLike = {
  status?: unknown;
  statusCode?: unknown;
  statusText?: unknown;
  response?: {
    status?: unknown;
    statusCode?: unknown;
    statusText?: unknown;
  } | null;
};

function stripKnownAuthErrorPrefixes(message: string): string {
  for (const prefix of KNOWN_AUTH_ERROR_PREFIXES) {
    if (message.startsWith(prefix)) {
      return message.slice(prefix.length).trim();
    }
  }

  return message.trim();
}

function normalizeStringMessage(value: string): string | null {
  const normalized = stripKnownAuthErrorPrefixes(value);
  if (!normalized || normalized === '{}' || normalized === '[object Object]') {
    return null;
  }

  return normalized;
}

export function normalizeAuthErrorMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    return normalizeStringMessage(value);
  }

  if (value instanceof Error) {
    return normalizeAuthErrorMessage(value.message);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalizedEntry = normalizeAuthErrorMessage(entry);
      if (normalizedEntry) {
        return normalizedEntry;
      }
    }

    return null;
  }

  if (value && typeof value === 'object') {
    const typedValue = value as Record<string, unknown> & HttpStatusLike;
    const candidates = [
      typedValue.message,
      typedValue.error_description,
      typedValue.error,
      typedValue.details,
      typedValue.detail,
      typedValue.hint,
      typedValue.msg,
      typedValue.statusText,
      typedValue.response?.statusText,
    ];

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeAuthErrorMessage(candidate);
      if (normalizedCandidate) {
        return normalizedCandidate;
      }
    }

    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== '{}' && serialized !== '[]') {
        return stripKnownAuthErrorPrefixes(serialized);
      }
    } catch {
      return null;
    }
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

export function getAuthErrorMessage(error: unknown, fallbackMessage: string): string {
  return normalizeAuthErrorMessage(error) ?? fallbackMessage;
}

function readHttpStatusCode(value: unknown): number | null {
  if (typeof value === 'string') {
    const normalizedMessage = normalizeAuthErrorMessage(value);
    if (!normalizedMessage) {
      return null;
    }

    const match = normalizedMessage.match(/\b(4\d\d|5\d\d)\b/);
    return match ? Number(match[1]) : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const typedValue = value as HttpStatusLike;
  const directCandidates = [
    typedValue.status,
    typedValue.statusCode,
    typedValue.response?.status,
    typedValue.response?.statusCode,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  const normalizedMessage = normalizeAuthErrorMessage(value);
  if (!normalizedMessage) {
    return null;
  }

  const match = normalizedMessage.match(/\b(4\d\d|5\d\d)\b/);
  return match ? Number(match[1]) : null;
}

export function getSocialSignInErrorMessage(
  error: unknown,
  { unavailable, serverError, fallback }: SocialSignInErrorMessages
): string {
  const statusCode = readHttpStatusCode(error);

  if (statusCode === 404) {
    return unavailable;
  }

  if (statusCode != null && statusCode >= 500) {
    return serverError;
  }

  return getAuthErrorMessage(error, fallback);
}
