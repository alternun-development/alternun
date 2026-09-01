export const ADMIN_SESSION_COOKIE_NAME = 'alternun_admin_session';
export const ADMIN_CSRF_COOKIE_NAME = 'alternun_admin_csrf';

type CookieMap = Readonly<Record<string, string | undefined>>;
type HeaderMap = Readonly<Record<string, string | undefined>>;

export interface AdminMutationRequest {
  method: string;
  cookies: CookieMap;
  headers: HeaderMap;
}

export function createAdminSessionCookie(sessionId: string) {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    value: sessionId,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
    },
  };
}

function getCsrfHeader(headers: HeaderMap): string | undefined {
  return Object.entries(headers).find(([name]) => name.toLowerCase() === 'x-csrf-token')?.[1];
}

export function assertAdminMutationCsrf(request: AdminMutationRequest): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
    return;
  }

  const csrfCookie = request.cookies[ADMIN_CSRF_COOKIE_NAME];
  const csrfHeader = getCsrfHeader(request.headers);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw new Error('CSRF validation failed');
  }
}

export function createAdminLoginRedirect({
  loginEntryUrl,
  returnTo,
}: {
  loginEntryUrl: string;
  returnTo: string;
}): string {
  const loginUrl = new URL(loginEntryUrl);
  loginUrl.searchParams.set('next', returnTo);
  return loginUrl.toString();
}
