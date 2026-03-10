function readEnvString(value: unknown,): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function requireLike(value: string | undefined, fallback: string,): string {
  return value && value.trim().length > 0 ? value : fallback;
}

export const adminEnv = {
  apiUrl: requireLike(readEnvString(import.meta.env.VITE_API_URL,), 'http://localhost:3000',),
  authIssuer: requireLike(
    readEnvString(import.meta.env.VITE_AUTH_ISSUER,),
    'https://auth.alternun.co/application/o/alternun-admin/',
  ),
  authClientId: requireLike(readEnvString(import.meta.env.VITE_AUTH_CLIENT_ID,), 'alternun-admin',),
  authAudience: requireLike(readEnvString(import.meta.env.VITE_AUTH_AUDIENCE,), 'alternun-app',),
  appEnv: requireLike(readEnvString(import.meta.env.VITE_APP_ENV,), 'development',),
} as const;
