import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value == null || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export interface BetterAuthDevOAuthProxyConfig {
  enabled: boolean;
  currentURL?: string;
  productionURL?: string;
  secret?: string;
  maxAge?: number;
}

export interface BetterAuthDevConfig {
  port: number;
  host: string;
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  googleClientId: string;
  googleClientSecret: string;
  discordClientId: string;
  discordClientSecret: string;
  oauthProxy: BetterAuthDevOAuthProxyConfig;
}

export function loadEnvFile(filePath = resolve(process.cwd(), '.env.better-auth')): void {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(filePath)) {
    return;
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const contents = readFileSync(filePath, 'utf8');

  for (const line of contents.split('\n')) {
    const normalizedLine = line.replace(/\r$/, '').trim();

    if (!normalizedLine || normalizedLine.startsWith('#')) {
      continue;
    }

    const lineWithoutExport = normalizedLine.startsWith('export ')
      ? normalizedLine.slice('export '.length).trim()
      : normalizedLine;
    const equalsIndex = lineWithoutExport.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    const key = lineWithoutExport.slice(0, equalsIndex).trim();
    const rawValue = lineWithoutExport.slice(equalsIndex + 1);

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    // eslint-disable-next-line security/detect-object-injection
    process.env[key] = parseEnvValue(rawValue);
  }
}

function splitOrigins(value: string | undefined, fallback: string[]): string[] {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return fallback;
  }

  const parsed = trimmedValue
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return parsed.length > 0 ? parsed : fallback;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const trimmedValues: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      trimmedValues.push(trimmed);
    }
  }

  return trimmedValues.filter((value, index, array) => array.indexOf(value) === index);
}

function normalizeBetterAuthBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/auth$/, '');
}

function deriveBetterAuthSecret(env: NodeJS.ProcessEnv): string {
  const explicitSecret = env.BETTER_AUTH_SECRET?.trim() ?? env.AUTH_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  const issuerSigningKey =
    env.AUTHENTIK_JWT_SIGNING_KEY?.trim() ??
    env.INFRA_BACKEND_API_AUTHENTIK_JWT_SIGNING_KEY?.trim();
  if (issuerSigningKey) {
    return createHash('sha256').update(`${issuerSigningKey}:better-auth`).digest('hex');
  }

  return 'example-better-auth-secret-default';
}

function deriveTrustedAppOrigin(value: string | undefined): string | null {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(normalizeBetterAuthBaseUrl(trimmedValue));
    const hostnameParts = url.hostname.split('.');
    const apiIndex = hostnameParts.indexOf('api');

    if (apiIndex < 0) {
      return null;
    }

    hostnameParts[apiIndex] = 'airs';
    url.hostname = hostnameParts.join('.');
    return url.origin;
  } catch {
    return null;
  }
}

function resolveOAuthProxyConfig(env: NodeJS.ProcessEnv): BetterAuthDevOAuthProxyConfig {
  const currentURL = env.BETTER_AUTH_OAUTH_PROXY_CURRENT_URL?.trim() ?? '';
  const productionURL = env.BETTER_AUTH_OAUTH_PROXY_PRODUCTION_URL?.trim() ?? '';
  const secret = env.BETTER_AUTH_OAUTH_PROXY_SECRET?.trim() ?? '';
  const maxAge = Number(env.BETTER_AUTH_OAUTH_PROXY_MAX_AGE?.trim() ?? 60);
  const enabled =
    parseBoolean(env.BETTER_AUTH_OAUTH_PROXY_ENABLED, false) ||
    Boolean(currentURL || productionURL || secret);

  return {
    enabled,
    ...(currentURL ? { currentURL } : {}),
    ...(productionURL ? { productionURL } : {}),
    ...(secret ? { secret } : {}),
    ...(Number.isFinite(maxAge) && maxAge > 0 ? { maxAge } : {}),
  };
}

export function resolveBetterAuthDevConfig(
  env: NodeJS.ProcessEnv = process.env
): BetterAuthDevConfig {
  const port = Number(env.PORT ?? 9083);
  const host = env.HOST?.trim() ?? '127.0.0.1';
  const baseURL = normalizeBetterAuthBaseUrl(
    env.BETTER_AUTH_URL?.trim() ?? env.AUTH_BETTER_AUTH_URL?.trim() ?? `http://${host}:${port}`
  );
  const secret = deriveBetterAuthSecret(env);
  const trustedOrigins = splitOrigins(
    env.BETTER_AUTH_TRUSTED_ORIGINS,
    uniqueStrings([
      'http://localhost:8081',
      'http://127.0.0.1:8081',
      deriveTrustedAppOrigin(env.AUTH_BETTER_AUTH_URL?.trim()),
      deriveTrustedAppOrigin(env.EXPO_PUBLIC_BETTER_AUTH_URL?.trim()),
    ])
  );
  const googleClientId = env.GOOGLE_AUTH_CLIENT_ID?.trim() ?? '';
  const googleClientSecret =
    env.GOOGLE_AUTH_CLIENT_SECRET?.trim() ?? env.GOOGLEA_AUTH_CLIENT_SECRET?.trim() ?? '';
  const discordClientId = env.DISCORD_AUTH_CLIENT_ID?.trim() ?? '';
  const discordClientSecret = env.DISCORD_AUTH_CLIENT_SECRET?.trim() ?? '';

  return {
    port,
    host,
    baseURL,
    secret,
    trustedOrigins,
    googleClientId,
    googleClientSecret,
    discordClientId,
    discordClientSecret,
    oauthProxy: resolveOAuthProxyConfig(env),
  };
}
