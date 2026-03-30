import {
  hasPendingAuthentikCallback,
  resolveSafeRedirect as rawResolveSafeRedirect,
} from '@alternun/auth';

type SafeRedirectConfig = {
  allowedOrigins: string[];
  fallbackUrl: string;
};

const resolveSafeRedirect = rawResolveSafeRedirect as (
  target: string | null | undefined,
  config: SafeRedirectConfig
) => string;

export const AUTHENTIK_INITIAL_SEARCH = typeof window !== 'undefined' ? window.location.search : '';

export const AUTH_RETURN_TO_KEY = 'alternun:auth:return-to';

export function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

export function getInitialAuthSearch(): string {
  if (AUTHENTIK_INITIAL_SEARCH) {
    return AUTHENTIK_INITIAL_SEARCH;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.search ?? '';
}

export function isAuthentikCallbackSearch(searchString?: string): boolean {
  return hasPendingAuthentikCallback(searchString ?? getInitialAuthSearch());
}

export function readStoredReturnTo(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  if (!stored || stored.trim().length === 0) {
    return null;
  }

  return stored.trim();
}

export function storeReturnTo(target: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(AUTH_RETURN_TO_KEY, target);
}

export function normalizeInternalHref(target: string): string {
  if (target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }

  try {
    const url = new URL(target);
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
}

export function resolveReturnTarget(target: string | null | undefined): string {
  const allowedOrigins = typeof window !== 'undefined' ? [window.location.origin] : [];
  const safeTarget = resolveSafeRedirect(target ?? '/', {
    allowedOrigins,
    fallbackUrl: '/',
  });

  return normalizeInternalHref(safeTarget);
}
