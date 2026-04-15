export const AUTH_CALLBACK_QUERY_KEYS = [
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'type',
  'error',
  'error_code',
  'error_description',
  'code',
] as const;

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

function readSearchParam(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function readWebAuthCallbackPayload(
  searchValue: string,
  hashValue: string
): WebAuthCallbackPayload {
  const normalizedHash = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue;
  const hashParams = new URLSearchParams(normalizedHash);
  const queryParams = new URLSearchParams(searchValue);
  const readParam = (key: string): string | null =>
    readSearchParam(hashParams, key) ?? readSearchParam(queryParams, key);

  const accessToken = readParam('access_token');
  const refreshToken = readParam('refresh_token');
  const callbackType = readParam('type');
  const callbackError = readParam('error');
  const callbackErrorDescription = readParam('error_description');
  const callbackErrorCode = readParam('error_code');

  return {
    accessToken,
    refreshToken,
    callbackType,
    callbackError,
    callbackErrorDescription,
    callbackErrorCode,
    hasPayload: [
      accessToken,
      refreshToken,
      callbackType,
      callbackError,
      callbackErrorDescription,
      callbackErrorCode,
    ].some((value) => Boolean((value?.length ?? 0) > 0)),
  };
}

export function stripAuthCallbackTokensFromUrl(
  urlValue: string,
  runtimeWindow?: WebCallbackWindowLike | null
): void {
  const parsedUrl = new URL(urlValue);
  const searchParams = new URLSearchParams(parsedUrl.search);

  for (const key of AUTH_CALLBACK_QUERY_KEYS) {
    searchParams.delete(key);
  }

  const nextSearch = searchParams.toString();
  const nextPath = `${parsedUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
  const activeWindow =
    runtimeWindow ??
    (typeof window === 'undefined' ? undefined : (window as WebCallbackWindowLike));

  if (activeWindow?.history?.replaceState) {
    activeWindow.history.replaceState({}, '', nextPath);
  }
}
