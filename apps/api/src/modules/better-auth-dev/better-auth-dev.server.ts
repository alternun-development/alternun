import { createServer, type Server } from 'node:http';
import { betterAuth } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import { oAuthProxy } from 'better-auth/plugins/oauth-proxy';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { BetterAuthDevConfig, BetterAuthDevOAuthProxyConfig } from './better-auth-dev.config';
import { getDatabase } from '../../common/database/connection';
import * as betterAuthSchema from '../../common/database/better-auth.schema';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
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

function buildOAuthProxyPlugin(
  proxy: BetterAuthDevOAuthProxyConfig
): ReturnType<typeof oAuthProxy> | null {
  if (!proxy.enabled) {
    return null;
  }

  return oAuthProxy({
    ...(proxy.currentURL ? { currentURL: proxy.currentURL } : {}),
    ...(proxy.productionURL ? { productionURL: proxy.productionURL } : {}),
    ...(proxy.secret ? { secret: proxy.secret } : {}),
    ...(proxy.maxAge ? { maxAge: proxy.maxAge } : {}),
  });
}

export function createBetterAuthDevAuth(
  config: BetterAuthDevConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const oauthProxyPlugin = buildOAuthProxyPlugin(config.oauthProxy);
  const effectiveRedirectBaseURL =
    config.oauthProxy.enabled && config.oauthProxy.productionURL
      ? config.oauthProxy.productionURL
      : config.baseURL;
  const hasGoogleProvider = Boolean(config.googleClientId && config.googleClientSecret);
  const hasDiscordProvider = Boolean(config.discordClientId && config.discordClientSecret);

  // Derive parent domain for cross-subdomain cookies (e.g., ".alternun.co" from "api.alternun.co")
  let cookieDomain: string | undefined;
  try {
    const url = new URL(config.baseURL);
    const parts = url.hostname.split('.');
    if (parts.length > 2) {
      // For "api.alternun.co" → ".alternun.co"; for "api.example.co.uk" → ".example.co.uk"
      cookieDomain = `.${parts.slice(-2).join('.')}`;
    }
  } catch {
    // Fall back to undefined (browser will handle it)
  }

  const socialProviders = {
    ...(hasGoogleProvider
      ? {
          google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
            redirectURI: `${stripTrailingSlash(effectiveRedirectBaseURL)}/auth/callback/google`,
            prompt: 'select_account' as const,
            accessType: 'offline' as const,
          },
        }
      : {}),
    ...(hasDiscordProvider
      ? {
          discord: {
            clientId: config.discordClientId,
            clientSecret: config.discordClientSecret,
            redirectURI: `${stripTrailingSlash(effectiveRedirectBaseURL)}/auth/callback/discord`,
          },
        }
      : {}),
  };
  const trustedOrigins = uniqueStrings([
    ...config.trustedOrigins,
    config.baseURL,
    'http://localhost:9083',
    config.oauthProxy.currentURL,
    config.oauthProxy.productionURL,
  ]);

  const isProduction = process.env.NODE_ENV === 'production';
  const db = getDatabase();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return betterAuth({
    appName: 'Alternun Dev Better Auth',
    baseURL: config.baseURL,
    basePath: '/auth',
    secret: config.secret,
    trustedOrigins,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: betterAuthSchema,
    }),
    plugins: oauthProxyPlugin ? [oauthProxyPlugin] : [],
    socialProviders,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    account: {
      storeAccountCookie: true,
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', ...(hasDiscordProvider ? ['discord'] : []), 'email-password'],
        allowDifferentEmails: false,
      },
      skipStateCookieCheck: config.oauthProxy.enabled,
    },
    advanced: {
      useSecureCookies: isProduction,
      disableCSRFCheck: false,
      disableOriginCheck: false,
      skipTrailingSlashes: true,
      defaultCookieDomain: cookieDomain,
    },
    telemetry: {
      enabled: false,
    },
  });
}

export function createBetterAuthDevServer(config: BetterAuthDevConfig): Server {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const auth = createBetterAuthDevAuth(config);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  const authHandler = toNodeHandler(auth.handler);

  return createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Missing request URL');
      return;
    }

    void authHandler(req, res);
  });
}
