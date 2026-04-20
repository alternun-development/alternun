import { readWebAuthCallbackPayload } from '../../../../packages/auth/src/runtime/web/callbackPayload';

export const AUTH_WEB_CALLBACK_ROUTE = '/auth/callback';

function normalizeCallbackPath(callbackPath: string): string {
  const trimmedPath = callbackPath.trim();
  if (!trimmedPath) {
    return AUTH_WEB_CALLBACK_ROUTE;
  }

  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}

function normalizeSearch(searchValue: string): string {
  const trimmedSearch = searchValue.trim();
  if (!trimmedSearch) {
    return '';
  }

  return trimmedSearch.startsWith('?') ? trimmedSearch : `?${trimmedSearch}`;
}

function normalizeHash(hashValue: string): string {
  const trimmedHash = hashValue.trim();
  if (!trimmedHash) {
    return '';
  }

  return trimmedHash.startsWith('#') ? trimmedHash : `#${trimmedHash}`;
}

export function buildWebAuthCallbackRedirectPath(
  searchValue: string,
  hashValue: string,
  callbackPath: string = AUTH_WEB_CALLBACK_ROUTE
): string | null {
  const callbackPayload = readWebAuthCallbackPayload(searchValue, hashValue);
  if (!callbackPayload.hasPayload) {
    return null;
  }

  return `${normalizeCallbackPath(callbackPath)}${normalizeSearch(searchValue)}${normalizeHash(
    hashValue
  )}`;
}

export type AuthCallbackSuccessVariant = 'default' | 'recovery' | 'signup';

export function resolveAuthCallbackSuccessVariant(
  callbackType: string | null | undefined
): AuthCallbackSuccessVariant {
  const normalizedType = callbackType?.trim().toLowerCase();

  if (normalizedType === 'signup') {
    return 'signup';
  }

  if (normalizedType === 'recovery' || normalizedType === 'reset_password') {
    return 'recovery';
  }

  return 'default';
}
