import { createServer, type Server } from 'node:http';
import { betterAuth } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import { oAuthProxy } from 'better-auth/plugins/oauth-proxy';
import type { BetterAuthDevConfig, BetterAuthDevOAuthProxyConfig } from './better-auth-dev.config';

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
): ReturnType<typeof betterAuth> {
  const oauthProxyPlugin = buildOAuthProxyPlugin(config.oauthProxy);
  const effectiveRedirectBaseURL =
    config.oauthProxy.enabled && config.oauthProxy.productionURL
      ? config.oauthProxy.productionURL
      : config.baseURL;
  const hasGoogleProvider = Boolean(config.googleClientId && config.googleClientSecret);
  const hasDiscordProvider = Boolean(config.discordClientId && config.discordClientSecret);
  const socialProviders = {
    ...(hasGoogleProvider
      ? {
          google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
            redirectURI: `${stripTrailingSlash(effectiveRedirectBaseURL)}/auth/callback/google`,
            prompt: 'select_account' as const,
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

  return betterAuth({
    appName: 'Alternun Dev Better Auth',
    baseURL: config.baseURL,
    basePath: '/auth',
    secret: config.secret,
    trustedOrigins,
    plugins: oauthProxyPlugin ? [oauthProxyPlugin] : [],
    socialProviders,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    account: {
      storeAccountCookie: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', ...(hasDiscordProvider ? ['discord'] : []), 'email-password'],
      },
      skipStateCookieCheck: config.oauthProxy.enabled,
    },
    advanced: {
      useSecureCookies: false,
      disableCSRFCheck: false,
      disableOriginCheck: false,
      skipTrailingSlashes: true,
    },
    telemetry: {
      enabled: false,
    },
  });
}

export function createBetterAuthDevServer(config: BetterAuthDevConfig): Server {
  const auth = createBetterAuthDevAuth(config);
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
