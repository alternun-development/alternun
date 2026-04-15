export declare const AUTH_CALLBACK_QUERY_KEYS: readonly [
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'type',
  'error',
  'error_code',
  'error_description',
  'code'
];
export interface WebAuthCallbackPayload {
  accessToken: string | null;
  refreshToken: string | null;
  callbackType: string | null;
  callbackError: string | null;
  callbackErrorDescription: string | null;
  callbackErrorCode: string | null;
  hasPayload: boolean;
}
export interface WebCallbackHistoryLike {
  replaceState?: (data: unknown, unused: string, url?: string | URL | null) => void;
}
export interface WebCallbackLocationLike {
  pathname?: string | null;
}
export interface WebCallbackWindowLike {
  history?: WebCallbackHistoryLike;
  location?: WebCallbackLocationLike;
}
export declare function readWebAuthCallbackPayload(
  searchValue: string,
  hashValue: string
): WebAuthCallbackPayload;
export declare function stripAuthCallbackTokensFromUrl(
  urlValue: string,
  runtimeWindow?: WebCallbackWindowLike | null
): void;
