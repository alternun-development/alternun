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
export declare class AlternunAuthError extends Error {
  readonly code: AuthErrorCode;
  readonly cause?: unknown;
  constructor(code: AuthErrorCode, message: string, options?: AlternunAuthErrorOptions);
}
export declare class AlternunConfigError extends AlternunAuthError {
  constructor(message: string, options?: AlternunAuthErrorOptions);
}
export declare class AlternunProviderError extends AlternunAuthError {
  constructor(message: string, options?: AlternunAuthErrorOptions);
}
export declare class AlternunSessionError extends AlternunAuthError {
  constructor(message: string, options?: AlternunAuthErrorOptions);
}
export declare function isAlternunAuthError(value: unknown): value is AlternunAuthError;
export declare function toAlternunAuthError(
  error: unknown,
  fallbackCode?: AuthErrorCode,
  fallbackMessage?: string
): AlternunAuthError;
