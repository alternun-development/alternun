interface ImportMetaEnvVars {
  VITE_API_URL?: string;
  VITE_AUTH_ISSUER?: string;
  VITE_AUTH_CLIENT_ID?: string;
  VITE_AUTH_AUDIENCE?: string;
  VITE_AUTH_GOOGLE_ENABLED?: string;
  VITE_AUTH_GOOGLE_FLOW_SLUG?: string;
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
const authGoogleFlowSlug = readEnvString(env.VITE_AUTH_GOOGLE_FLOW_SLUG)?.trim();

export const adminEnv = {
  apiUrl: requireLike(readEnvString(env.VITE_API_URL), 'http://localhost:8082'),
  authIssuer: requireLike(
    readEnvString(env.VITE_AUTH_ISSUER),
    'https://sso.alternun.co/application/o/alternun-admin/'
  ),
  authClientId: requireLike(readEnvString(env.VITE_AUTH_CLIENT_ID), 'alternun-admin'),
  authAudience: requireLike(readEnvString(env.VITE_AUTH_AUDIENCE), 'alternun-app'),
  authGoogleEnabled: readBoolean(readEnvString(env.VITE_AUTH_GOOGLE_ENABLED)),
  authGoogleFlowSlug: authGoogleFlowSlug === '' ? undefined : authGoogleFlowSlug,
  appEnv: requireLike(readEnvString(env.VITE_APP_ENV), 'development'),
  appVersion: __APP_VERSION__,
} as const;
