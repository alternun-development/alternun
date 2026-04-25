const BETTER_AUTH_SOCIAL_SIGN_IN_PATH = '/auth/sign-in/social';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function normalizeBetterAuthRequestBody(pathname: string, body: unknown): unknown {
  if (pathname !== BETTER_AUTH_SOCIAL_SIGN_IN_PATH || !isRecord(body)) {
    return body;
  }

  const callbackURL = readTrimmedString(body.callbackURL);
  const redirectUri = readTrimmedString(body.redirectUri);

  if (!redirectUri || callbackURL) {
    return body;
  }

  const errorCallbackURL = readTrimmedString(body.errorCallbackURL) ?? redirectUri;
  const newUserCallbackURL = readTrimmedString(body.newUserCallbackURL) ?? redirectUri;

  return {
    ...body,
    callbackURL: redirectUri,
    errorCallbackURL,
    newUserCallbackURL,
  };
}
