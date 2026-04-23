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
  timeout: string;
  fallback: string;
}

const COMMON_SIGNUP_FAILURE_PATTERNS = [
  'invalid email or password',
  'invalid credentials',
  'authentication failed',
  'user not found',
  'email not found',
  'already registered',
  'already exists',
  'duplicate',
  'incorrect password',
];

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

function tryNormalizeJsonMessage(value: string): string | null {
  const trimmed = stripKnownAuthErrorPrefixes(value).trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  try {
    return normalizeAuthErrorMessage(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

export function normalizeAuthErrorMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    return tryNormalizeJsonMessage(value) ?? normalizeStringMessage(value);
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

export function getSignupErrorMessage(error: unknown, fallbackMessage: string): string {
  const message = getAuthErrorMessage(error, fallbackMessage);
  const normalized = message.toLowerCase();

  if (COMMON_SIGNUP_FAILURE_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return fallbackMessage;
  }

  return message;
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
  { unavailable, serverError, timeout, fallback }: SocialSignInErrorMessages
): string {
  const statusCode = readHttpStatusCode(error);

  if (statusCode === 404) {
    return unavailable;
  }

  if (statusCode === 408) {
    return timeout;
  }

  if (statusCode != null && statusCode >= 500) {
    return serverError;
  }

  return getAuthErrorMessage(error, fallback);
}
