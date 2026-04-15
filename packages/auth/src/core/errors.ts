export type AuthErrorCode =
  | 'CONFIG_ERROR'
  | 'UNSUPPORTED_FLOW'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'SESSION_ERROR'
  | 'VALIDATION_ERROR'
  | 'MIGRATION_ERROR';

export interface AlternunAuthErrorOptions {
  cause?: unknown;
}

export class AlternunAuthError extends Error {
  readonly code: AuthErrorCode;
  readonly cause?: unknown;

  constructor(code: AuthErrorCode, message: string, options: AlternunAuthErrorOptions = {}) {
    super(message);
    this.name = 'AlternunAuthError';
    this.code = code;
    this.cause = options.cause;
  }
}

export class AlternunConfigError extends AlternunAuthError {
  constructor(message: string, options: AlternunAuthErrorOptions = {}) {
    super('CONFIG_ERROR', message, options);
    this.name = 'AlternunConfigError';
  }
}

export class AlternunProviderError extends AlternunAuthError {
  constructor(message: string, options: AlternunAuthErrorOptions = {}) {
    super('PROVIDER_ERROR', message, options);
    this.name = 'AlternunProviderError';
  }
}

export class AlternunSessionError extends AlternunAuthError {
  constructor(message: string, options: AlternunAuthErrorOptions = {}) {
    super('SESSION_ERROR', message, options);
    this.name = 'AlternunSessionError';
  }
}

export function isAlternunAuthError(value: unknown): value is AlternunAuthError {
  return value instanceof AlternunAuthError;
}

export function toAlternunAuthError(
  error: unknown,
  fallbackCode: AuthErrorCode = 'PROVIDER_ERROR',
  fallbackMessage = 'Unexpected auth error'
): AlternunAuthError {
  if (error instanceof AlternunAuthError) {
    return error;
  }

  if (error instanceof Error) {
    return new AlternunAuthError(fallbackCode, error.message || fallbackMessage, {
      cause: error,
    });
  }

  if (typeof error === 'string') {
    return new AlternunAuthError(fallbackCode, error || fallbackMessage);
  }

  return new AlternunAuthError(fallbackCode, fallbackMessage, { cause: error });
}
