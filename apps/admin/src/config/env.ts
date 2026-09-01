interface ImportMetaEnvVars {
  VITE_API_URL?: string;
  VITE_AUTH_ISSUER?: string;
  VITE_AUTH_CLIENT_ID?: string;
  VITE_AUTH_AUDIENCE?: string;
  VITE_AUTH_LOGIN_ENTRY_URL?: string;
  VITE_AUTH_GOOGLE_ENABLED?: string;
  VITE_AUTH_GOOGLE_FLOW_SLUG?: string;
  VITE_AUTH_PASSWORD_FLOW_SLUG?: string;
  VITE_APP_ENV?: string;
}

function readEnvString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function requireLike(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

function readBoolean(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');
}

const env = import.meta.env as ImportMetaEnvVars;
const appEnv = requireLike(readEnvString(env.VITE_APP_ENV), 'development');
const configuredLoginEntryUrl = readEnvString(env.VITE_AUTH_LOGIN_ENTRY_URL)?.trim();
const configuredGoogleFlowSlug = readEnvString(env.VITE_AUTH_GOOGLE_FLOW_SLUG)?.trim();
const configuredPasswordFlowSlug = readEnvString(env.VITE_AUTH_PASSWORD_FLOW_SLUG)?.trim();

export const adminEnv = {
  apiUrl: requireLike(readEnvString(env.VITE_API_URL), 'http://localhost:8082'),
  authIssuer: requireLike(
    readEnvString(env.VITE_AUTH_ISSUER),
    'https://sso.alternun.co/application/o/alternun-admin/'
  ),
  authClientId: requireLike(readEnvString(env.VITE_AUTH_CLIENT_ID), 'alternun-admin'),
  authAudience: requireLike(readEnvString(env.VITE_AUTH_AUDIENCE), 'alternun-app'),
  authLoginEntryUrl: configuredLoginEntryUrl ?? undefined,
  authGoogleEnabled: readBoolean(readEnvString(env.VITE_AUTH_GOOGLE_ENABLED)),
  // A configured SourceStage flow preserves both the Google selection and the
  // pending Admin OIDC authorization request across the external callback.
  authGoogleFlowSlug: configuredGoogleFlowSlug ?? undefined,
  authPasswordFlowSlug: configuredPasswordFlowSlug ?? undefined,
  appEnv,
  appVersion: __APP_VERSION__,
} as const;
